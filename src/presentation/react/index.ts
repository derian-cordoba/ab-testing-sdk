import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
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

const ABTestingClientContext = createContext<ABTestingClient | null>(null);

/** Props accepted by the React provider wrapper. */
export interface ABProviderProps {
  /** Shared SDK client instance for the React tree. */
  client: ABTestingClient;
  /** React children that should receive the client through context. */
  children: ReactNode;
}

/**
 * Options accepted by the assignments hook.
 */
export interface UseAssignmentsOptions {
  /** Optional server API params used for automatic hydration or manual refreshes. */
  apiParams?: HydrateFromApiParams;
  /** Optional meta tag name override used for automatic meta hydration. */
  metaName?: string;
  /** Hydrates from the SSR meta tag when the hook mounts. */
  hydrateFromMetaOnMount?: boolean;
  /** Hydrates from the assignments API when the hook mounts. */
  hydrateFromApiOnMount?: boolean;
}

/**
 * Runtime state exposed by the assignments hook.
 */
export interface UseAssignmentsResult {
  /** Current assignment map stored in the client. */
  assignments: AssignmentMap;
  /** Current bucketing unit associated with the assignments. */
  unit: UnitIdentity | null;
  /** Whether the client currently holds hydrated assignments. */
  isHydrated: boolean;
  /** Whether one hook-triggered hydration request is in progress. */
  isLoading: boolean;
  /** Most recent hook-triggered hydration error. */
  error: unknown;
  /** Refreshes assignments from the API, using the client cache when enabled. */
  refreshFromApi: (params?: HydrateFromApiParams) => Promise<HydratedAssignments>;
  /** Hydrates assignments from the SSR meta tag. */
  hydrateFromMeta: (name?: string) => HydratedAssignments | null;
  /** Clears the client-managed in-memory cache. */
  clearCache: () => void;
}

/**
 * Options accepted by the feature flag item hook.
 */
export interface UseFeatureFlagOptions {
  /** Enables or disables automatic loading. */
  enabled?: boolean;
  /** Loads the feature flag when the hook mounts. */
  loadOnMount?: boolean;
}

/**
 * Runtime state exposed by the feature flag item hook.
 */
export interface UseFeatureFlagResult {
  /** Currently loaded feature flag state. */
  flag: FeatureFlag | null;
  /** Whether one hook-triggered request is in progress. */
  isLoading: boolean;
  /** Most recent hook-triggered request error. */
  error: unknown;
  /** Reloads the feature flag, using the client cache when enabled. */
  refresh: () => Promise<FeatureFlag>;
  /** Clears the client-managed in-memory cache. */
  clearCache: () => void;
}

/**
 * Options accepted by the feature flag collection hook.
 */
export interface UseFeatureFlagsOptions {
  /** Optional query params forwarded to the feature flags list endpoint. */
  params?: ListFeatureFlagsParams;
  /** Enables or disables automatic loading. */
  enabled?: boolean;
  /** Loads the collection when the hook mounts. */
  loadOnMount?: boolean;
}

/**
 * Runtime state exposed by the feature flag collection hook.
 */
export interface UseFeatureFlagsResult {
  /** Currently loaded feature flag collection. */
  collection: FeatureFlagCollection | null;
  /** Whether one hook-triggered request is in progress. */
  isLoading: boolean;
  /** Most recent hook-triggered request error. */
  error: unknown;
  /** Reloads the collection, using the client cache when enabled. */
  refresh: (params?: ListFeatureFlagsParams) => Promise<FeatureFlagCollection>;
  /** Clears the client-managed in-memory cache. */
  clearCache: () => void;
}

/**
 * Provides one SDK client instance to a React subtree.
 */
export function ABProvider({ client, children }: ABProviderProps): ReactElement {
  return createElement(
    ABTestingClientContext.Provider,
    { value: client },
    children,
  );
}

/**
 * Returns the unified SDK client from React context.
 *
 * Throws when used outside `ABProvider`.
 */
export function useABClient(): ABTestingClient {
  const client = useContext(ABTestingClientContext);

  if (client === null) {
    throw new Error("ABProvider is missing from the React tree.");
  }

  return client;
}

/** Props accepted by the React feature flags admin provider wrapper. */
export interface FeatureFlagsAdminProviderProps {
  /** Shared feature flags admin client instance for the React tree. */
  client: ABTestingClient;
  /** React children that should receive the admin client through context. */
  children: ReactNode;
}

/**
 * Provides one feature flags admin client instance to a React subtree.
 */
export function FeatureFlagsAdminProvider({
  client,
  children,
}: FeatureFlagsAdminProviderProps): ReactElement {
  return createElement(
    ABTestingClientContext.Provider,
    { value: client },
    children,
  );
}

/**
 * Returns the feature flags admin client from React context.
 *
 * Throws when used outside `FeatureFlagsAdminProvider`.
 */
export function useFeatureFlagsAdminClient(): FeatureFlagsAdminClient {
  const client = useContext(ABTestingClientContext);

  if (client === null) {
    throw new Error(
      "FeatureFlagsAdminProvider is missing from the React tree.",
    );
  }

  return client;
}

/**
 * React-native wrapper around assignment hydration and cache control.
 */
export function useAssignments(
  options: UseAssignmentsOptions = {},
): UseAssignmentsResult {
  const client = useABClient();
  const [assignments, setAssignments] = useState<AssignmentMap>(client.all());
  const [unit, setUnit] = useState<UnitIdentity | null>(client.unit());
  const [isHydrated, setIsHydrated] = useState<boolean>(client.isHydrated());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);
  const hasLoadedFromApiRef = useRef<boolean>(false);
  const hasLoadedFromMetaRef = useRef<boolean>(false);

  function syncFromClient(): void {
    setAssignments(client.all());
    setUnit(client.unit());
    setIsHydrated(client.isHydrated());
  }

  async function refreshFromApi(
    params = options.apiParams,
  ): Promise<HydratedAssignments> {
    if (params === undefined) {
      throw new Error(
        "useAssignments.refreshFromApi() requires apiParams in the hook options or method call.",
      );
    }

    setIsLoading(true);
    setError(null);

    try {
      const hydrated = await client.hydrateFromApi(params);

      syncFromClient();

      return hydrated;
    } catch (cause) {
      setError(cause);
      throw cause;
    } finally {
      setIsLoading(false);
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

  useEffect(() => {
    syncFromClient();
  }, [client]);

  useEffect(() => {
    if (options.hydrateFromMetaOnMount !== true || hasLoadedFromMetaRef.current) {
      return;
    }

    hasLoadedFromMetaRef.current = true;
    hydrateFromMeta(options.metaName);
  }, [client, options.hydrateFromMetaOnMount, options.metaName]);

  useEffect(() => {
    if (options.hydrateFromApiOnMount !== true || hasLoadedFromApiRef.current) {
      return;
    }

    hasLoadedFromApiRef.current = true;
    void refreshFromApi();
  }, [client, options.hydrateFromApiOnMount, options.apiParams]);

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
 * React-native wrapper around one feature flag read.
 */
export function useFeatureFlag(
  key: string,
  options: UseFeatureFlagOptions = {},
): UseFeatureFlagResult {
  const client = useABClient();
  const [flag, setFlag] = useState<FeatureFlag | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);
  const hasLoadedRef = useRef<boolean>(false);

  async function refresh(): Promise<FeatureFlag> {
    setIsLoading(true);
    setError(null);

    try {
      const loaded = await client.getFeatureFlag(key);

      setFlag(loaded);

      return loaded;
    } catch (cause) {
      setError(cause);
      throw cause;
    } finally {
      setIsLoading(false);
    }
  }

  function clearCache(): void {
    client.clearCache();
  }

  useEffect(() => {
    setFlag(null);
    hasLoadedRef.current = false;
  }, [client, key]);

  useEffect(() => {
    if (options.enabled === false || options.loadOnMount === false || hasLoadedRef.current) {
      return;
    }

    hasLoadedRef.current = true;
    void refresh();
  }, [client, key, options.enabled, options.loadOnMount]);

  return {
    flag,
    isLoading,
    error,
    refresh,
    clearCache,
  };
}

/**
 * React-native wrapper around the feature flags collection read.
 */
export function useFeatureFlags(
  options: UseFeatureFlagsOptions = {},
): UseFeatureFlagsResult {
  const client = useABClient();
  const [collection, setCollection] = useState<FeatureFlagCollection | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);
  const hasLoadedRef = useRef<boolean>(false);
  const paramsKey = JSON.stringify(options.params ?? {});

  async function refresh(
    params = options.params,
  ): Promise<FeatureFlagCollection> {
    setIsLoading(true);
    setError(null);

    try {
      const loaded = await client.listFeatureFlags(params);

      setCollection(loaded);

      return loaded;
    } catch (cause) {
      setError(cause);
      throw cause;
    } finally {
      setIsLoading(false);
    }
  }

  function clearCache(): void {
    client.clearCache();
  }

  useEffect(() => {
    setCollection(null);
    hasLoadedRef.current = false;
  }, [client, paramsKey]);

  useEffect(() => {
    if (options.enabled === false || options.loadOnMount === false || hasLoadedRef.current) {
      return;
    }

    hasLoadedRef.current = true;
    void refresh();
  }, [client, options.enabled, options.loadOnMount, paramsKey]);

  return {
    collection,
    isLoading,
    error,
    refresh,
    clearCache,
  };
}
