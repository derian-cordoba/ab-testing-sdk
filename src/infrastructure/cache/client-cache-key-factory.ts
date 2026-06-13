import type {
  HydrateFromApiParams,
  UnitIdentity,
} from "../../domain/contracts/ab-client.js";
import type { ListFeatureFlagsParams } from "../../domain/contracts/feature-flags-admin-client.js";

const ASSIGNMENTS_CACHE_PREFIX = "assignments:";
const FEATURE_FLAG_ITEM_CACHE_PREFIX = "feature-flags:item:";
const FEATURE_FLAGS_LIST_CACHE_PREFIX = "feature-flags:list:";

/**
 * Central cache-key factory for SDK in-memory cache namespaces.
 */
export class ClientCacheKeyFactory {
  /**
   * Builds one assignment cache key scoped by the server unit identity.
   */
  public assignments(params: HydrateFromApiParams | UnitIdentity): string {
    return `${ASSIGNMENTS_CACHE_PREFIX}${params.unitType}:${params.unitKey}`;
  }

  /**
   * Builds one feature flag item cache key.
   */
  public featureFlag(key: string): string {
    return `${FEATURE_FLAG_ITEM_CACHE_PREFIX}${encodeURIComponent(key)}`;
  }

  /**
   * Builds one feature flag list cache key.
   */
  public featureFlagsList(params?: ListFeatureFlagsParams): string {
    return `${FEATURE_FLAGS_LIST_CACHE_PREFIX}${JSON.stringify(params ?? {})}`;
  }

  /**
   * Returns the feature flag list namespace prefix.
   */
  public featureFlagsListPrefix(): string {
    return FEATURE_FLAGS_LIST_CACHE_PREFIX;
  }
}
