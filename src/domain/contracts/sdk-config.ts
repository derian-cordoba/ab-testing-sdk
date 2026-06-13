import type { ABTestingClientOptions } from "./ab-testing-client.js";
import type { UnitIdentity } from "./ab-client.js";
import type { FeatureFlagsAdminClientOptions } from "./feature-flags-admin-client.js";

/**
 * Flat environment source consumed by the SDK configuration service.
 *
 * This shape works with `process.env`, `import.meta.env`, test doubles, or any
 * user-provided key/value store.
 */
export interface EnvSource {
  [key: string]: string | undefined;
}

/**
 * Options used to build an `EnvService` instance.
 */
export interface EnvServiceOptions {
  /**
   * Environment variable source.
   *
   * When omitted, the service falls back to `process.env` when available.
   */
  source?: EnvSource;
  /**
   * Prefix used for all SDK-specific variables.
   *
   * Example: `AB_TESTING_` or `VITE_AB_`.
   */
  prefix?: string;
}

/**
 * Resolved runtime configuration derived from environment variables.
 */
export interface SDKEnvironmentConfig {
  /** Fully qualified or relative assignments endpoint URL. */
  assignmentsEndpoint: string;
  /** Fully qualified or relative feature flags admin endpoint URL. */
  featureFlagsEndpoint: string;
  /** Accept header sent to the assignments API. */
  acceptHeader: string;
  /** DOM meta tag name used for SSR hydration. */
  metaName: string;
  /** Optional fallback unit identity for API hydration. */
  unit: UnitIdentity | null;
}

/**
 * Options accepted by the dotenv bootstrap helper.
 */
export interface DotenvLoadOptions {
  /** Optional path to the env file. */
  path?: string;
  /** Whether existing variables should be overwritten. */
  override?: boolean;
  /** Optional target object to receive parsed variables. */
  processEnv?: EnvSource;
}

/**
 * Result returned by the dotenv bootstrap helper.
 */
export interface DotenvLoadResult {
  /** Whether dotenv produced at least one parsed variable. */
  loaded: boolean;
  /** Variables parsed from the dotenv file. */
  parsed: EnvSource;
}

/**
 * Env-derived defaults for the feature flags admin client.
 */
export interface FeatureFlagsAdminClientEnvOptions
  extends FeatureFlagsAdminClientOptions {}

/**
 * Env-derived defaults for the unified SDK client.
 */
export interface ABTestingClientEnvOptions extends ABTestingClientOptions {}
