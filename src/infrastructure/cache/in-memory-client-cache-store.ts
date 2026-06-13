import type { ABTestingClientCacheStore } from "../../domain/contracts/client-cache.js";

interface CacheEntry {
  value: unknown;
  expiresAt: number | null;
}

/**
 * Default in-memory cache store used by the SDK when client caching is enabled.
 */
export class InMemoryClientCacheStore implements ABTestingClientCacheStore {
  private readonly entries = new Map<string, CacheEntry>();

  /** @inheritdoc */
  public get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);

    if (entry === undefined) {
      return undefined;
    }

    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.entries.delete(key);

      return undefined;
    }

    return entry.value as T;
  }

  /** @inheritdoc */
  public set<T>(key: string, value: T, ttlMs?: number): void {
    const expiresAt = ttlMs === undefined ? null : Date.now() + ttlMs;

    this.entries.set(key, {
      value,
      expiresAt,
    });
  }

  /** @inheritdoc */
  public delete(key: string): void {
    this.entries.delete(key);
  }

  /** @inheritdoc */
  public deleteByPrefix(prefix: string): void {
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
      }
    }
  }

  /** @inheritdoc */
  public clear(): void {
    this.entries.clear();
  }
}
