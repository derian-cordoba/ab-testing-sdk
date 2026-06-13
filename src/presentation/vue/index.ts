import { computed, inject, ref, watch, type Ref } from "vue";
import type { App, InjectionKey } from "vue";
import type {
  AssignmentMap,
  HydrateFromApiParams,
  HydratedAssignments,
  UnitIdentity,
} from "../../domain/contracts/ab-client.js";
import type {
  FeatureFlag,
  FeatureFlagCollection,
  FeatureFlagsAdminClient,
  ListFeatureFlagsParams,
} from "../../domain/contracts/feature-flags-admin-client.js";
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
 * Options accepted by the assignments composable.
 */
export interface UseAssignmentsOptions {
  /** Optional server API params used for automatic hydration or manual refreshes. */
  apiParams?: HydrateFromApiParams;
  /** Optional meta tag name override used for automatic meta hydration. */
  metaName?: string;
  /** Hydrates from the SSR meta tag when the composable becomes active. */
  hydrateFromMetaOnMount?: boolean;
  /** Hydrates from the assignments API when the composable becomes active. */
  hydrateFromApiOnMount?: boolean;
}

/**
 * State exposed by the assignments composable.
 */
export interface UseAssignmentsResult {
  assignments: Ref<AssignmentMap>;
  unit: Ref<UnitIdentity | null>;
  isHydrated: Ref<boolean>;
  isLoading: Ref<boolean>;
  error: Ref<unknown>;
  refreshFromApi: (params?: HydrateFromApiParams) => Promise<HydratedAssignments>;
  hydrateFromMeta: (name?: string) => HydratedAssignments | null;
  clearCache: () => void;
}

/**
 * Options accepted by the feature flag item composable.
 */
export interface UseFeatureFlagOptions {
  /** Enables or disables automatic loading. */
  enabled?: boolean;
  /** Loads the feature flag when the composable becomes active. */
  loadOnMount?: boolean;
}

/**
 * State exposed by the feature flag item composable.
 */
export interface UseFeatureFlagResult {
  flag: Ref<FeatureFlag | null>;
  isLoading: Ref<boolean>;
  error: Ref<unknown>;
  refresh: () => Promise<FeatureFlag>;
  clearCache: () => void;
}

/**
 * Options accepted by the feature flag collection composable.
 */
export interface UseFeatureFlagsOptions {
  /** Optional query params forwarded to the feature flags list endpoint. */
  params?: ListFeatureFlagsParams;
  /** Enables or disables automatic loading. */
  enabled?: boolean;
  /** Loads the collection when the composable becomes active. */
  loadOnMount?: boolean;
}

/**
 * State exposed by the feature flag collection composable.
 */
export interface UseFeatureFlagsResult {
  collection: Ref<FeatureFlagCollection | null>;
  isLoading: Ref<boolean>;
  error: Ref<unknown>;
  refresh: (params?: ListFeatureFlagsParams) => Promise<FeatureFlagCollection>;
  clearCache: () => void;
}

/**
 * Installs the SDK client into a Vue application via dependency injection.
 */
export function installABTesting(app: App, options: InstallABTestingOptions): void {
  app.provide(ABClientKey, options.client);
}

/**
 * Returns the unified SDK client from the current Vue injection context.
 *
 * Throws when called before `installABTesting()` has provided the client.
 */
export function useABClient(): ABTestingClient {
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

/**
 * Vue-native wrapper around assignment hydration and cache control.
 */
export function useAssignments(
  options: UseAssignmentsOptions = {},
): UseAssignmentsResult {
  const client = useABClient();
  const assignments = ref<AssignmentMap>(client.all());
  const unit = ref<UnitIdentity | null>(client.unit());
  const isHydrated = ref<boolean>(client.isHydrated());
  const isLoading = ref<boolean>(false);
  const error = ref<unknown>(null);

  function syncFromClient(): void {
    assignments.value = client.all();
    unit.value = client.unit();
    isHydrated.value = client.isHydrated();
  }

  async function refreshFromApi(
    params = options.apiParams,
  ): Promise<HydratedAssignments> {
    if (params === undefined) {
      throw new Error(
        "useAssignments.refreshFromApi() requires apiParams in the composable options or method call.",
      );
    }

    isLoading.value = true;
    error.value = null;

    try {
      const hydrated = await client.hydrateFromApi(params);

      syncFromClient();

      return hydrated;
    } catch (cause) {
      error.value = cause;
      throw cause;
    } finally {
      isLoading.value = false;
    }
  }

  function hydrateFromMeta(name = options.metaName): HydratedAssignments | null {
    const hydrated = client.hydrateFromMeta(name);

    syncFromClient();

    return hydrated;
  }

  function clearCache(): void {
    client.clearCache();
  }

  if (options.hydrateFromMetaOnMount === true) {
    hydrateFromMeta(options.metaName);
  }

  if (options.hydrateFromApiOnMount === true) {
    void refreshFromApi();
  }

  return {
    assignments,
    unit,
    isHydrated,
    isLoading,
    error,
    refreshFromApi,
    hydrateFromMeta,
    clearCache,
  };
}

/**
 * Vue-native wrapper around one feature flag read.
 */
export function useFeatureFlag(
  key: string,
  options: UseFeatureFlagOptions = {},
): UseFeatureFlagResult {
  const client = useABClient();
  const flag = ref<FeatureFlag | null>(null);
  const isLoading = ref<boolean>(false);
  const error = ref<unknown>(null);

  async function refresh(): Promise<FeatureFlag> {
    isLoading.value = true;
    error.value = null;

    try {
      const loaded = await client.getFeatureFlag(key);

      flag.value = loaded;

      return loaded;
    } catch (cause) {
      error.value = cause;
      throw cause;
    } finally {
      isLoading.value = false;
    }
  }

  function clearCache(): void {
    client.clearCache();
  }

  if (options.enabled !== false && options.loadOnMount !== false) {
    void refresh();
  }

  return {
    flag,
    isLoading,
    error,
    refresh,
    clearCache,
  };
}

/**
 * Vue-native wrapper around the feature flag collection read.
 */
export function useFeatureFlags(
  options: UseFeatureFlagsOptions = {},
): UseFeatureFlagsResult {
  const client = useABClient();
  const collection = ref<FeatureFlagCollection | null>(null);
  const isLoading = ref<boolean>(false);
  const error = ref<unknown>(null);

  async function refresh(
    params = options.params,
  ): Promise<FeatureFlagCollection> {
    isLoading.value = true;
    error.value = null;

    try {
      const loaded = await client.listFeatureFlags(params);

      collection.value = loaded;

      return loaded;
    } catch (cause) {
      error.value = cause;
      throw cause;
    } finally {
      isLoading.value = false;
    }
  }

  function clearCache(): void {
    client.clearCache();
  }

  if (options.enabled !== false && options.loadOnMount !== false) {
    void refresh();
  }

  return {
    collection,
    isLoading,
    error,
    refresh,
    clearCache,
  };
}
