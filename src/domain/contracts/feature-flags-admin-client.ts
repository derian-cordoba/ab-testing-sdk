/**
 * One feature flag targeting rule.
 */
export interface FeatureFlagCondition {
  /** Attribute name inspected by the server-side flag evaluator. */
  attribute: string;
  /** Comparison operator understood by the backend. */
  operator: string;
  /** Expected value compared against the unit attribute. */
  expected: unknown;
}

/**
 * Boolean operator used to combine feature flag conditions.
 */
export type FeatureFlagConditionsLogic = "all" | "any";

/**
 * Normalized feature flag state exposed by the admin API.
 */
export interface FeatureFlag {
  /** Stable flag key. */
  key: string;
  /** Whether the flag is enabled. */
  isEnabled: boolean;
  /** Current rollout percentage from 0 to 100. */
  rolloutPercentage: number;
  /** Current targeting conditions. */
  conditions: FeatureFlagCondition[];
  /** How the backend combines targeting conditions. */
  conditionsLogic: FeatureFlagConditionsLogic | null;
  /** Whether the kill switch is currently active. */
  isKilled: boolean;
  /** ISO timestamp when the kill switch was activated. */
  killedAt: string | null;
  /** ISO timestamp of the most recent evaluation. */
  lastEvaluatedAt: string | null;
  /** ISO timestamp when the record was created. */
  createdAt: string | null;
  /** ISO timestamp when the record was last updated. */
  updatedAt: string | null;
}

/**
 * Raw JSON:API resource document returned by one feature flag endpoint.
 */
export interface JsonApiFeatureFlagDocument {
  data: {
    id: string;
    type: "feature-flags";
    attributes: {
      is_enabled: boolean;
      rollout_percentage: number;
      conditions: FeatureFlagCondition[];
      conditions_logic: FeatureFlagConditionsLogic | null;
      is_killed: boolean;
      killed_at: string | null;
      last_evaluated_at: string | null;
      created_at: string | null;
      updated_at: string | null;
    };
  };
}

/**
 * Raw JSON:API collection document returned by the feature flags index endpoint.
 */
export interface JsonApiFeatureFlagCollectionDocument {
  data: JsonApiFeatureFlagDocument["data"][];
  meta?: Record<string, unknown>;
  links?: Record<string, unknown>;
}

/**
 * Normalized collection result returned by the admin client.
 */
export interface FeatureFlagCollection {
  /** Current page of normalized feature flags. */
  items: FeatureFlag[];
  /** Optional pagination or collection metadata. */
  meta: Record<string, unknown> | null;
  /** Optional pagination or collection links. */
  links: Record<string, unknown> | null;
}

/**
 * Filter options supported by the feature flags list endpoint.
 */
export interface ListFeatureFlagsParams {
  /** Restrict the list to enabled or disabled flags. */
  isEnabled?: boolean;
}

/**
 * Body accepted by the feature flag create endpoint.
 */
export interface CreateFeatureFlagParams {
  /** Stable flag key to create. */
  key: string;
  /** Optional initial enabled state. */
  isEnabled?: boolean;
  /** Optional initial rollout percentage. */
  rolloutPercentage?: number;
}

/**
 * Body accepted by the rollout update endpoint.
 */
export interface SetFeatureFlagRolloutParams {
  /** Desired rollout percentage from 0 to 100. */
  rolloutPercentage: number;
}

/**
 * Body accepted by the conditions update endpoint.
 */
export interface SetFeatureFlagConditionsParams {
  /** Complete replacement list of conditions. */
  conditions: FeatureFlagCondition[];
  /** Optional boolean operator used to combine conditions. */
  conditionsLogic?: FeatureFlagConditionsLogic;
}

/**
 * Construction options for the feature flag admin client.
 */
export interface FeatureFlagsAdminClientOptions {
  /** Base feature flags endpoint URL. */
  endpoint?: string;
  /** Custom fetch implementation for non-browser runtimes or tests. */
  fetchImpl?: typeof fetch;
  /** Accept header sent to the API. */
  acceptHeader?: string;
  /** Content-Type header sent for JSON request bodies. */
  contentType?: string;
}

/**
 * Management client for the feature flags admin API.
 */
export interface FeatureFlagsAdminClient {
  /**
   * Returns the current paginated feature flag list.
   */
  listFeatureFlags(params?: ListFeatureFlagsParams): Promise<FeatureFlagCollection>;

  /**
   * Returns one feature flag by key.
   */
  getFeatureFlag(key: string): Promise<FeatureFlag>;

  /**
   * Creates one feature flag state record.
   */
  createFeatureFlag(params: CreateFeatureFlagParams): Promise<FeatureFlag>;

  /**
   * Permanently deletes one feature flag state record.
   */
  deleteFeatureFlag(key: string): Promise<void>;

  /**
   * Enables one feature flag.
   */
  enableFeatureFlag(key: string): Promise<FeatureFlag>;

  /**
   * Disables one feature flag.
   */
  disableFeatureFlag(key: string): Promise<FeatureFlag>;

  /**
   * Updates the rollout percentage for one feature flag.
   */
  setFeatureFlagRollout(
    key: string,
    params: SetFeatureFlagRolloutParams,
  ): Promise<FeatureFlag>;

  /**
   * Activates the kill switch for one feature flag.
   */
  activateFeatureFlagKillSwitch(key: string): Promise<FeatureFlag>;

  /**
   * Deactivates the kill switch for one feature flag.
   */
  deactivateFeatureFlagKillSwitch(key: string): Promise<FeatureFlag>;

  /**
   * Replaces the targeting conditions for one feature flag.
   */
  setFeatureFlagConditions(
    key: string,
    params: SetFeatureFlagConditionsParams,
  ): Promise<FeatureFlag>;

  /**
   * Removes all targeting conditions from one feature flag.
   */
  clearFeatureFlagConditions(key: string): Promise<void>;
}
