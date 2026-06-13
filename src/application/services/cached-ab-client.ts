import type {
  ABClient,
  AssignmentMap,
  HydrateFromApiParams,
  HydratedAssignments,
  UnitIdentity,
} from "../../domain/contracts/ab-client.js";
import type { ABTestingClientCacheStore } from "../../domain/contracts/client-cache.js";
import { ClientCacheKeyFactory } from "../../infrastructure/cache/client-cache-key-factory.js";

/**
 * Cache decorator for assignment hydration.
 *
 * This class only caches API hydration results. It intentionally leaves
 * meta-tag hydration and direct state replacement as uncached operations so the
 * network cache remains scoped to explicit server reads.
 */
export class CachedABClient implements ABClient {
  private readonly delegate: ABClient;
  private readonly cacheStore: ABTestingClientCacheStore;
  private readonly keyFactory: ClientCacheKeyFactory;
  private readonly ttlMs: number | undefined;

  /**
   * Creates a cached assignments client decorator.
   */
  public constructor(options: {
    delegate: ABClient;
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
  public getVariant(experimentKey: string): string | null {
    return this.delegate.getVariant(experimentKey);
  }

  /** @inheritdoc */
  public all(): AssignmentMap {
    return this.delegate.all();
  }

  /** @inheritdoc */
  public has(experimentKey: string): boolean {
    return this.delegate.has(experimentKey);
  }

  /** @inheritdoc */
  public isHydrated(): boolean {
    return this.delegate.isHydrated();
  }

  /** @inheritdoc */
  public unit(): UnitIdentity | null {
    return this.delegate.unit();
  }

  /** @inheritdoc */
  public replace(assignments: HydratedAssignments | null): void {
    this.delegate.replace(assignments);
  }

  /** @inheritdoc */
  public hydrateFromMeta(name?: string): HydratedAssignments | null {
    return this.delegate.hydrateFromMeta(name);
  }

  /** @inheritdoc */
  public async hydrateFromApi(
    params: HydrateFromApiParams,
  ): Promise<HydratedAssignments> {
    const key = this.keyFactory.assignments(params);
    const cached = this.cacheStore.get<HydratedAssignments>(key);

    if (cached !== undefined) {
      this.delegate.replace(cached);

      return cached;
    }

    const hydrated = await this.delegate.hydrateFromApi(params);

    this.cacheStore.set(key, hydrated, this.ttlMs);

    return hydrated;
  }
}
