import type {
  ABTestingClient,
  ABTestingClientOptions,
} from "../../domain/contracts/ab-testing-client.js";
import type { EnvServiceOptions } from "../../domain/contracts/sdk-config.js";
import { EnvService } from "../../infrastructure/config/env-service.js";
import { DefaultABTestingClient } from "../services/default-ab-testing-client.js";

/**
 * Creates the unified SDK client implementation.
 *
 * The factory automatically reads environment-derived defaults through
 * `EnvService`. Any explicit `options` passed by the consumer take precedence
 * over those resolved defaults.
 */
export function createABClient(
  options: ABTestingClientOptions = {},
): ABTestingClient {
  return new DefaultABTestingClient({
    ...EnvService.fromProcessEnv().loadABTestingClientOptions(),
    ...options,
  });
}

/**
 * Creates the unified SDK client from environment-derived configuration.
 *
 * This helper is useful in SSR entrypoints, Node.js runtimes, or bundler-based
 * applications where endpoint and meta configuration should come from a shared
 * environment source instead of inline literals.
 */
export function createABClientFromEnv(
  envOptions: EnvServiceOptions = {},
  clientOptions: ABTestingClientOptions = {},
): ABTestingClient {
  return new DefaultABTestingClient({
    ...new EnvService(envOptions).loadABTestingClientOptions(),
    ...clientOptions,
  });
}

/**
 * Backward-compatible alias for `createABClient()`.
 */
export function createClient(options: ABTestingClientOptions = {}): ABTestingClient {
  return createABClient(options);
}

/**
 * Backward-compatible alias for `createABClientFromEnv()`.
 */
export function createClientFromEnv(
  envOptions: EnvServiceOptions = {},
  clientOptions: ABTestingClientOptions = {},
): ABTestingClient {
  return createABClientFromEnv(envOptions, clientOptions);
}
