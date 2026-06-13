import type {
  ABClient,
  AssignmentMap,
  HydrateFromApiParams,
  HydratedAssignments,
  UnitIdentity,
} from "../../domain/contracts/ab-client.js";
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
import type { ABTestingClient } from "../../domain/contracts/ab-testing-client.js";

/**
 * Dependency bag required by the unified SDK facade.
 */
export interface DefaultABTestingClientDependencies {
  runtimeClient: ABClient;
  featureFlagsClient: FeatureFlagsAdminClient;
  cacheStore?: ABTestingClientCacheStore | null;
}

/**
 * Unified SDK facade built from already-composed runtime and feature flag
 * capabilities.
 *
 * This class intentionally contains no cache policy, endpoint, or transport
 * construction logic. Those concerns belong to the composition root.
 */
export class DefaultABTestingClient implements ABTestingClient {
  private readonly runtimeClient: ABClient;
  private readonly featureFlagsClient: FeatureFlagsAdminClient;
  private readonly cacheStore: ABTestingClientCacheStore | null;

  /**
   * Creates a new unified SDK client instance.
   */
  public constructor(dependencies: DefaultABTestingClientDependencies) {
    this.runtimeClient = dependencies.runtimeClient;
    this.featureFlagsClient = dependencies.featureFlagsClient;
    this.cacheStore = dependencies.cacheStore ?? null;
  }

  /** @inheritdoc */
  public getVariant(experimentKey: string): string | null {
    return this.runtimeClient.getVariant(experimentKey);
  }

  /** @inheritdoc */
  public all(): AssignmentMap {
    return this.runtimeClient.all();
  }

  /** @inheritdoc */
  public has(experimentKey: string): boolean {
    return this.runtimeClient.has(experimentKey);
  }

  /** @inheritdoc */
  public isHydrated(): boolean {
    return this.runtimeClient.isHydrated();
  }

  /** @inheritdoc */
  public unit(): UnitIdentity | null {
    return this.runtimeClient.unit();
  }

  /** @inheritdoc */
  public replace(assignments: HydratedAssignments | null): void {
    this.runtimeClient.replace(assignments);
  }

  /** @inheritdoc */
  public hydrateFromMeta(name?: string): HydratedAssignments | null {
    return this.runtimeClient.hydrateFromMeta(name);
  }

  /** @inheritdoc */
  public hydrateFromApi(params: HydrateFromApiParams): Promise<HydratedAssignments> {
    return this.runtimeClient.hydrateFromApi(params);
  }

  /** @inheritdoc */
  public listFeatureFlags(
    params?: ListFeatureFlagsParams,
  ): Promise<FeatureFlagCollection> {
    return this.featureFlagsClient.listFeatureFlags(params);
  }

  /** @inheritdoc */
  public getFeatureFlag(key: string): Promise<FeatureFlag> {
    return this.featureFlagsClient.getFeatureFlag(key);
  }

  /** @inheritdoc */
  public createFeatureFlag(params: CreateFeatureFlagParams): Promise<FeatureFlag> {
    return this.featureFlagsClient.createFeatureFlag(params);
  }

  /** @inheritdoc */
  public deleteFeatureFlag(key: string): Promise<void> {
    return this.featureFlagsClient.deleteFeatureFlag(key);
  }

  /** @inheritdoc */
  public enableFeatureFlag(key: string): Promise<FeatureFlag> {
    return this.featureFlagsClient.enableFeatureFlag(key);
  }

  /** @inheritdoc */
  public disableFeatureFlag(key: string): Promise<FeatureFlag> {
    return this.featureFlagsClient.disableFeatureFlag(key);
  }

  /** @inheritdoc */
  public setFeatureFlagRollout(
    key: string,
    params: SetFeatureFlagRolloutParams,
  ): Promise<FeatureFlag> {
    return this.featureFlagsClient.setFeatureFlagRollout(key, params);
  }

  /** @inheritdoc */
  public activateFeatureFlagKillSwitch(key: string): Promise<FeatureFlag> {
    return this.featureFlagsClient.activateFeatureFlagKillSwitch(key);
  }

  /** @inheritdoc */
  public deactivateFeatureFlagKillSwitch(key: string): Promise<FeatureFlag> {
    return this.featureFlagsClient.deactivateFeatureFlagKillSwitch(key);
  }

  /** @inheritdoc */
  public setFeatureFlagConditions(
    key: string,
    params: SetFeatureFlagConditionsParams,
  ): Promise<FeatureFlag> {
    return this.featureFlagsClient.setFeatureFlagConditions(key, params);
  }

  /** @inheritdoc */
  public clearFeatureFlagConditions(key: string): Promise<void> {
    return this.featureFlagsClient.clearFeatureFlagConditions(key);
  }

  /** @inheritdoc */
  public clearCache(): void {
    this.cacheStore?.clear();
  }
}
