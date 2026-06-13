import type {
  ABTestingClient,
  ABTestingClientOptions,
} from "../../domain/contracts/ab-testing-client.js";
import type { EnvServiceOptions } from "../../domain/contracts/sdk-config.js";
import { EnvService } from "../../infrastructure/config/env-service.js";
import { CachedABClient } from "../services/cached-ab-client.js";
import { CachedFeatureFlagsAdminClient } from "../services/cached-feature-flags-admin-client.js";
import { ClientCacheOptionsResolver } from "../services/client-cache-options-resolver.js";
import {
  DefaultABTestingClient,
  type DefaultABTestingClientDependencies,
} from "../services/default-ab-testing-client.js";
import { DefaultABClient } from "../services/default-ab-client.js";
import { DefaultFeatureFlagsAdminClient } from "../services/default-feature-flags-admin-client.js";

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
  return createClientFromResolvedOptions({
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
  return createClientFromResolvedOptions({
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

function createClientFromResolvedOptions(
  options: ABTestingClientOptions,
): ABTestingClient {
  const dependencies = buildDefaultABTestingClientDependencies(options);

  return new DefaultABTestingClient(dependencies);
}

function buildDefaultABTestingClientDependencies(
  options: ABTestingClientOptions,
): DefaultABTestingClientDependencies {
  const runtimeClient = new DefaultABClient(buildRuntimeClientOptions(options));
  const featureFlagsClient = new DefaultFeatureFlagsAdminClient(
    buildFeatureFlagsClientOptions(options),
  );
  const cache = ClientCacheOptionsResolver.resolve(options);

  const cachedRuntimeClient =
    cache.settings.assignments.enabled && cache.store !== null
      ? new CachedABClient({
          delegate: runtimeClient,
          cacheStore: cache.store,
          ...(cache.settings.assignments.ttlMs !== undefined
            ? { ttlMs: cache.settings.assignments.ttlMs }
            : {}),
        })
      : runtimeClient;
  const cachedFeatureFlagsClient =
    cache.settings.featureFlags.enabled && cache.store !== null
      ? new CachedFeatureFlagsAdminClient({
          delegate: featureFlagsClient,
          cacheStore: cache.store,
          ...(cache.settings.featureFlags.ttlMs !== undefined
            ? { ttlMs: cache.settings.featureFlags.ttlMs }
            : {}),
        })
      : featureFlagsClient;

  return {
    runtimeClient: cachedRuntimeClient,
    featureFlagsClient: cachedFeatureFlagsClient,
    cacheStore: cache.store,
  };
}

function buildRuntimeClientOptions(
  options: ABTestingClientOptions,
): ConstructorParameters<typeof DefaultABClient>[0] {
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

  return runtimeOptions;
}

function buildFeatureFlagsClientOptions(
  options: ABTestingClientOptions,
): ConstructorParameters<typeof DefaultFeatureFlagsAdminClient>[0] {
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

  return featureFlagsOptions;
}
