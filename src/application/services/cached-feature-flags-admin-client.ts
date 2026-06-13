import type { ABTestingClientCacheStore } from "../../domain/contracts/client-cache.js";
import type {
  CreateFeatureFlagParams,
  FeatureFlag,
  FeatureFlagCollection,
  FeatureFlagsAdminClient,
  ListFeatureFlagsParams,
  SetFeatureFlagConditionsParams,
  SetFeatureFlagRolloutParams,
} from "../../domain/contracts/feature-flags-admin-client.js";
import { ClientCacheKeyFactory } from "../../infrastructure/cache/client-cache-key-factory.js";

/**
 * Cache decorator for feature flag admin reads.
 *
 * Read operations are cached, while write operations invalidate affected
 * entries and repopulate the item cache with the fresh mutation result.
 */
export class CachedFeatureFlagsAdminClient implements FeatureFlagsAdminClient {
  private readonly delegate: FeatureFlagsAdminClient;
  private readonly cacheStore: ABTestingClientCacheStore;
  private readonly keyFactory: ClientCacheKeyFactory;
  private readonly ttlMs: number | undefined;

  /**
   * Creates a cached feature flag admin client decorator.
   */
  public constructor(options: {
    delegate: FeatureFlagsAdminClient;
    cacheStore: ABTestingClientCacheStore;
    keyFactory?: ClientCacheKeyFactory;
    ttlMs?: number;
  }) {
    this.delegate = options.delegate;
    this.cacheStore = options.cacheStore;
    this.keyFactory = options.keyFactory ?? new ClientCacheKeyFactory();
    this.ttlMs = options.ttlMs;
  }

  /** @inheritdoc */
  public async listFeatureFlags(
    params?: ListFeatureFlagsParams,
  ): Promise<FeatureFlagCollection> {
    const key = this.keyFactory.featureFlagsList(params);
    const cached = this.cacheStore.get<FeatureFlagCollection>(key);

    if (cached !== undefined) {
      return cached;
    }

    const result = await this.delegate.listFeatureFlags(params);

    this.cacheStore.set(key, result, this.ttlMs);

    return result;
  }

  /** @inheritdoc */
  public async getFeatureFlag(key: string): Promise<FeatureFlag> {
    const cacheKey = this.keyFactory.featureFlag(key);
    const cached = this.cacheStore.get<FeatureFlag>(cacheKey);

    if (cached !== undefined) {
      return cached;
    }

    const result = await this.delegate.getFeatureFlag(key);

    this.cacheStore.set(cacheKey, result, this.ttlMs);

    return result;
  }

  /** @inheritdoc */
  public async createFeatureFlag(params: CreateFeatureFlagParams): Promise<FeatureFlag> {
    const result = await this.delegate.createFeatureFlag(params);

    this.storeMutationResult(result);

    return result;
  }

  /** @inheritdoc */
  public async deleteFeatureFlag(key: string): Promise<void> {
    await this.delegate.deleteFeatureFlag(key);
    this.invalidate(key);
  }

  /** @inheritdoc */
  public async enableFeatureFlag(key: string): Promise<FeatureFlag> {
    const result = await this.delegate.enableFeatureFlag(key);

    this.storeMutationResult(result);

    return result;
  }

  /** @inheritdoc */
  public async disableFeatureFlag(key: string): Promise<FeatureFlag> {
    const result = await this.delegate.disableFeatureFlag(key);

    this.storeMutationResult(result);

    return result;
  }

  /** @inheritdoc */
  public async setFeatureFlagRollout(
    key: string,
    params: SetFeatureFlagRolloutParams,
  ): Promise<FeatureFlag> {
    const result = await this.delegate.setFeatureFlagRollout(key, params);

    this.storeMutationResult(result);

    return result;
  }

  /** @inheritdoc */
  public async activateFeatureFlagKillSwitch(key: string): Promise<FeatureFlag> {
    const result = await this.delegate.activateFeatureFlagKillSwitch(key);

    this.storeMutationResult(result);

    return result;
  }

  /** @inheritdoc */
  public async deactivateFeatureFlagKillSwitch(key: string): Promise<FeatureFlag> {
    const result = await this.delegate.deactivateFeatureFlagKillSwitch(key);

    this.storeMutationResult(result);

    return result;
  }

  /** @inheritdoc */
  public async setFeatureFlagConditions(
    key: string,
    params: SetFeatureFlagConditionsParams,
  ): Promise<FeatureFlag> {
    const result = await this.delegate.setFeatureFlagConditions(key, params);

    this.storeMutationResult(result);

    return result;
  }

  /** @inheritdoc */
  public async clearFeatureFlagConditions(key: string): Promise<void> {
    await this.delegate.clearFeatureFlagConditions(key);
    this.invalidate(key);
  }

  private storeMutationResult(flag: FeatureFlag): void {
    this.invalidate(flag.key);
    this.cacheStore.set(this.keyFactory.featureFlag(flag.key), flag, this.ttlMs);
  }

  private invalidate(key: string): void {
    this.cacheStore.delete(this.keyFactory.featureFlag(key));
    this.cacheStore.deleteByPrefix(this.keyFactory.featureFlagsListPrefix());
  }
}
