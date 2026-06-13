import type {
  FeatureFlagsAdminClient,
  FeatureFlagsAdminClientOptions,
} from "../../domain/contracts/feature-flags-admin-client.js";
import type { EnvServiceOptions } from "../../domain/contracts/sdk-config.js";
import { EnvService } from "../../infrastructure/config/env-service.js";
import { DefaultFeatureFlagsAdminClient } from "../services/default-feature-flags-admin-client.js";

/**
 * Creates the default feature flags admin client.
 *
 * The factory automatically reads env-derived defaults through `EnvService`.
 * Any explicit `options` passed by the consumer take precedence over those
 * resolved defaults.
 */
export function createFeatureFlagsAdminClient(
  options: FeatureFlagsAdminClientOptions = {},
): FeatureFlagsAdminClient {
  return new DefaultFeatureFlagsAdminClient({
    ...EnvService.fromProcessEnv().loadFeatureFlagsAdminClientOptions(),
    ...options,
  });
}

/**
 * Creates the feature flags admin client from a custom env source or prefix.
 */
export function createFeatureFlagsAdminClientFromEnv(
  envOptions: EnvServiceOptions = {},
  clientOptions: FeatureFlagsAdminClientOptions = {},
): FeatureFlagsAdminClient {
  return new DefaultFeatureFlagsAdminClient({
    ...new EnvService(envOptions).loadFeatureFlagsAdminClientOptions(),
    ...clientOptions,
  });
}
