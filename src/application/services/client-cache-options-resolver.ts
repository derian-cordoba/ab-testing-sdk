import type {
  ABTestingClientCacheOptions,
  ABTestingClientCacheStore,
} from "../../domain/contracts/client-cache.js";
import type { ABTestingClientOptions } from "../../domain/contracts/ab-testing-client.js";
import { InMemoryClientCacheStore } from "../../infrastructure/cache/in-memory-client-cache-store.js";

/**
 * Resolved cache settings for one capability namespace.
 */
export interface ResolvedClientCacheNamespaceOptions {
  enabled: boolean;
  ttlMs: number | undefined;
}

/**
 * Fully resolved cache settings for the unified client.
 */
export interface ResolvedClientCacheOptions {
  assignments: ResolvedClientCacheNamespaceOptions;
  featureFlags: ResolvedClientCacheNamespaceOptions;
}

/**
 * Final cache dependencies used when composing the unified SDK client.
 */
export interface ResolvedClientCacheDependencies {
  settings: ResolvedClientCacheOptions;
  store: ABTestingClientCacheStore | null;
}

/**
 * Resolves opt-in cache settings for the unified SDK client.
 *
 * This keeps cache policy parsing out of the client implementation so the
 * composition root remains the only place where configuration is interpreted.
 */
export class ClientCacheOptionsResolver {
  /**
   * Resolves cache settings and the concrete store used by the client.
   */
  public static resolve(
    options: ABTestingClientOptions,
  ): ResolvedClientCacheDependencies {
    const settings = this.resolveSettings(options.cache);

    return {
      settings,
      store: this.resolveStore(options, settings),
    };
  }

  private static resolveSettings(
    options: boolean | ABTestingClientCacheOptions | undefined,
  ): ResolvedClientCacheOptions {
    const defaults: ResolvedClientCacheOptions = {
      assignments: {
        enabled: false,
        ttlMs: undefined,
      },
      featureFlags: {
        enabled: false,
        ttlMs: undefined,
      },
    };

    if (options === undefined || options === false) {
      return defaults;
    }

    if (options === true) {
      return {
        assignments: {
          enabled: true,
          ttlMs: undefined,
        },
        featureFlags: {
          enabled: true,
          ttlMs: undefined,
        },
      };
    }

    const cacheEnabled = options.enabled !== false;

    return {
      assignments: {
        enabled: cacheEnabled && options.assignments?.enabled !== false,
        ttlMs: options.assignments?.ttlMs ?? options.ttlMs,
      },
      featureFlags: {
        enabled: cacheEnabled && options.featureFlags?.enabled !== false,
        ttlMs: options.featureFlags?.ttlMs ?? options.ttlMs,
      },
    };
  }

  private static resolveStore(
    options: ABTestingClientOptions,
    settings: ResolvedClientCacheOptions,
  ): ABTestingClientCacheStore | null {
    if (!settings.assignments.enabled && !settings.featureFlags.enabled) {
      return null;
    }

    return options.cacheStore ?? new InMemoryClientCacheStore();
  }
}
