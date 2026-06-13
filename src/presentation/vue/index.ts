import { inject } from "vue";
import type { App, InjectionKey } from "vue";
import type { ABClient } from "../../domain/contracts/ab-client.js";

/** Injection key used to store the SDK client in the Vue app container. */
export const ABClientKey = Symbol("ABClient") as InjectionKey<ABClient>;

/** Options accepted by the Vue installer helper. */
export interface InstallABTestingOptions {
  /** Shared SDK client instance for the Vue application. */
  client: ABClient;
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
