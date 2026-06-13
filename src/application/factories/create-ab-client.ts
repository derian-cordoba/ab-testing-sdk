import type { ABClient, ABClientOptions } from "../../domain/contracts/ab-client.js";
import type { EnvServiceOptions } from "../../domain/contracts/sdk-config.js";
import { EnvService } from "../../infrastructure/config/env-service.js";
import { DefaultABClient } from "../services/default-ab-client.js";

/**
 * Creates the default SDK client implementation.
 *
 * The factory automatically reads environment-derived defaults through
 * `EnvService`. Any explicit `options` passed by the consumer take precedence
 * over those resolved defaults.
 */
export function createABClient(options: ABClientOptions = {}): ABClient {
  return new DefaultABClient({
    ...EnvService.fromProcessEnv().loadClientOptions(),
    ...options,
  });
}

/**
 * Creates the default SDK client from environment-derived configuration.
 *
 * This helper is useful in SSR entrypoints, Node.js runtimes, or bundler-based
 * applications where endpoint and meta configuration should come from a shared
 * environment source instead of inline literals.
 */
export function createABClientFromEnv(
  envOptions: EnvServiceOptions = {},
  clientOptions: ABClientOptions = {},
): ABClient {
  return new DefaultABClient({
    ...new EnvService(envOptions).loadClientOptions(),
    ...clientOptions,
  });
}
