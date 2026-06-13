/**
 * Namespace-specific cache behavior.
 *
 * Each namespace can be enabled or disabled independently and may override the
 * parent TTL when a shorter or longer in-memory lifetime is required.
 */
export interface ABTestingClientCacheNamespaceOptions {
  /** Enables or disables the namespace cache explicitly. */
  enabled?: boolean;
  /** Optional entry lifetime in milliseconds. */
  ttlMs?: number;
}

/**
 * Optional in-memory cache settings for the unified SDK client.
 *
 * Caching is disabled by default and must be enabled explicitly through
 * `createABClient({ cache: ... })`.
 */
export interface ABTestingClientCacheOptions {
  /** Enables or disables all SDK cache namespaces at once. */
  enabled?: boolean;
  /** Default entry lifetime in milliseconds applied to all namespaces. */
  ttlMs?: number;
  /** Assignment hydration cache settings. */
  assignments?: ABTestingClientCacheNamespaceOptions;
  /** Feature flag read cache settings. */
  featureFlags?: ABTestingClientCacheNamespaceOptions;
}

/**
 * Minimal cache store contract used by the SDK client.
 */
export interface ABTestingClientCacheStore {
  /** Returns one cached value when it exists and is still fresh. */
  get<T>(key: string): T | undefined;

  /** Stores one cached value. */
  set<T>(key: string, value: T, ttlMs?: number): void;

  /** Removes one cached value. */
  delete(key: string): void;

  /** Removes all cached values whose keys start with the provided prefix. */
  deleteByPrefix(prefix: string): void;

  /** Clears the entire cache store. */
  clear(): void;
}
