import type {
  ABClient,
  AssignmentMap,
  HydrateFromApiParams,
  HydratedAssignments,
  UnitIdentity,
} from "../../domain/contracts/ab-client.js";
import type {
  CreateFeatureFlagParams,
  FeatureFlag,
  FeatureFlagCollection,
  FeatureFlagsAdminClient,
  ListFeatureFlagsParams,
  SetFeatureFlagConditionsParams,
  SetFeatureFlagRolloutParams,
} from "../../domain/contracts/feature-flags-admin-client.js";
import type {
  ABTestingClient,
  ABTestingClientOptions,
} from "../../domain/contracts/ab-testing-client.js";
import { DefaultABClient } from "./default-ab-client.js";
import { DefaultFeatureFlagsAdminClient } from "./default-feature-flags-admin-client.js";

/**
 * Unified SDK facade built from the runtime assignments client and the feature
 * flags admin client.
 */
export class DefaultABTestingClient implements ABTestingClient {
  private readonly runtimeClient: ABClient;
  private readonly featureFlagsClient: FeatureFlagsAdminClient;

  /**
   * Creates a new unified SDK client instance.
   */
  public constructor(options: ABTestingClientOptions = {}) {
    const runtimeOptions: ConstructorParameters<typeof DefaultABClient>[0] = {};

    if (options.initial !== undefined) {
      runtimeOptions.initial = options.initial;
    }

    if (options.assignmentsEndpoint !== undefined) {
      runtimeOptions.endpoint = options.assignmentsEndpoint;
    }

    if (options.fetchImpl !== undefined) {
      runtimeOptions.fetchImpl = options.fetchImpl;
    }

    if (options.acceptHeader !== undefined) {
      runtimeOptions.acceptHeader = options.acceptHeader;
    }

    if (options.metaName !== undefined) {
      runtimeOptions.metaName = options.metaName;
    }

    this.runtimeClient = new DefaultABClient(runtimeOptions);

    const featureFlagsOptions: ConstructorParameters<
      typeof DefaultFeatureFlagsAdminClient
    >[0] = {};

    if (options.featureFlagsEndpoint !== undefined) {
      featureFlagsOptions.endpoint = options.featureFlagsEndpoint;
    }

    if (options.fetchImpl !== undefined) {
      featureFlagsOptions.fetchImpl = options.fetchImpl;
    }

    if (options.acceptHeader !== undefined) {
      featureFlagsOptions.acceptHeader = options.acceptHeader;
    }

    if (options.contentType !== undefined) {
      featureFlagsOptions.contentType = options.contentType;
    }

    this.featureFlagsClient = new DefaultFeatureFlagsAdminClient(
      featureFlagsOptions,
    );
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
}
