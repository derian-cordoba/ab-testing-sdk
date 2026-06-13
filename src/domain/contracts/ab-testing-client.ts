import type {
  ABClient,
  ABClientOptions,
  HydratedAssignments,
} from "./ab-client.js";
import type {
  FeatureFlagsAdminClient,
  FeatureFlagsAdminClientOptions,
} from "./feature-flags-admin-client.js";

/**
 * Unified SDK client contract.
 *
 * This facade combines runtime assignment hydration with feature flag
 * management operations so host applications can depend on one shared client
 * instance across framework adapters and application layers.
 */
export interface ABTestingClient extends ABClient, FeatureFlagsAdminClient {}

/**
 * Construction options for the unified SDK client.
 */
export interface ABTestingClientOptions
  extends Omit<ABClientOptions, "endpoint">,
    Omit<FeatureFlagsAdminClientOptions, "endpoint" | "acceptHeader" | "fetchImpl"> {
  /** Optional pre-hydrated runtime state, typically read from a meta tag. */
  initial?: HydratedAssignments | null;
  /** Assignments endpoint URL used by runtime hydration. */
  assignmentsEndpoint?: string;
  /** Feature flags admin endpoint URL. */
  featureFlagsEndpoint?: string;
  /** Shared fetch implementation for all HTTP operations. */
  fetchImpl?: typeof fetch;
  /** Shared Accept header for both API surfaces. */
  acceptHeader?: string;
}
