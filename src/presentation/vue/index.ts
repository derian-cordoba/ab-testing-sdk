import { inject } from "vue";
import type { App, InjectionKey } from "vue";
import type { ABClient } from "../../domain/contracts/ab-client.js";
import type { FeatureFlagsAdminClient } from "../../domain/contracts/feature-flags-admin-client.js";
import type { ABTestingClient } from "../../domain/contracts/ab-testing-client.js";

/** Injection key used to store the SDK client in the Vue app container. */
export const ABClientKey = Symbol("ABClient") as InjectionKey<ABTestingClient>;
/** Injection key used to store the feature flags admin client in the Vue app container. */
export const FeatureFlagsAdminClientKey = Symbol(
  "FeatureFlagsAdminClient",
) as InjectionKey<ABTestingClient>;

/** Options accepted by the Vue installer helper. */
export interface InstallABTestingOptions {
  /** Shared SDK client instance for the Vue application. */
  client: ABTestingClient;
}

/** Options accepted by the Vue feature flags admin installer helper. */
export interface InstallFeatureFlagsAdminOptions {
  /** Shared feature flags admin client instance for the Vue application. */
  client: ABTestingClient;
}

/**
 * Installs the SDK client into a Vue application via dependency injection.
 */
export function installABTesting(app: App, options: InstallABTestingOptions): void {
  app.provide(ABClientKey, options.client);
}

/**
 * Returns the SDK client from the current Vue injection context.
 *
 * Throws when called before `installABTesting()` has provided the client.
 */
export function useABClient(): ABClient {
  const client = inject(ABClientKey, null);

  if (client === null) {
    throw new Error("AB testing client has not been provided to the Vue app.");
  }

  return client;
}

/**
 * Installs the feature flags admin client into a Vue application via dependency injection.
 */
export function installFeatureFlagsAdmin(
  app: App,
  options: InstallFeatureFlagsAdminOptions,
): void {
  app.provide(FeatureFlagsAdminClientKey, options.client);
}

/**
 * Returns the feature flags admin client from the current Vue injection context.
 *
 * Throws when called before `installFeatureFlagsAdmin()` has provided the client.
 */
export function useFeatureFlagsAdminClient(): FeatureFlagsAdminClient {
  const client = inject(FeatureFlagsAdminClientKey, null);

  if (client === null) {
    throw new Error(
      "Feature flags admin client has not been provided to the Vue app.",
    );
  }

  return client;
}
