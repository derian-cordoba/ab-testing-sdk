/**
 * Experiment key to assigned variant key map.
 *
 * Example:
 * {
 *   "checkout-button-color": "green",
 *   "pricing-layout": "control"
 * }
 */
export type AssignmentMap = Record<string, string>;

/**
 * Normalized in-memory representation of server-authoritative assignments.
 *
 * Every supported transport in the SDK, such as DOM meta bootstrap and the
 * JSON:API endpoint, is converted into this shape before client code reads it.
 */
export interface HydratedAssignments {
  /** Stable unit namespace, for example `user` or `tenant`. */
  unitType: string;
  /** Stable unit identifier inside the namespace. */
  unitKey: string;
  /** Flat experiment key to variant key map. */
  assignments: AssignmentMap;
  /** Transport that produced this hydrated payload. */
  source: "meta" | "api";
}

/**
 * Raw payload expected inside the SSR `<meta>` bootstrap tag.
 *
 * This mirrors the server's DOM payload contract and intentionally keeps the
 * server-side snake_case field names.
 */
export interface MetaAssignmentsPayload {
  unit_type: string;
  unit_key: string;
  assignments: AssignmentMap;
}

/**
 * JSON:API document returned by the Laravel assignments endpoint.
 */
export interface JsonApiAssignmentsDocument {
  data: {
    type: "assignments";
    id: string;
    attributes: {
      unit_type: string;
      unit_key: string;
      assignments: AssignmentMap;
    };
  };
  meta?: {
    source?: string;
  };
}

/**
 * Minimal identity information for the current bucketing unit.
 */
export interface UnitIdentity {
  unitType: string;
  unitKey: string;
}

/**
 * Parameters required to request assignments from the server API.
 */
export interface HydrateFromApiParams {
  unitType: string;
  unitKey: string;
}

/**
 * Construction options for the A/B client.
 */
export interface ABClientOptions {
  /** Optional pre-hydrated state, typically read from a server-rendered meta tag. */
  initial?: HydratedAssignments | null;
  /** Assignments endpoint URL used by `hydrateFromApi()`. */
  endpoint?: string;
  /** Custom fetch implementation for non-browser runtimes or tests. */
  fetchImpl?: typeof fetch;
  /** Accept header sent to the assignments API. */
  acceptHeader?: string;
  /** DOM meta tag name used by `hydrateFromMeta()`. */
  metaName?: string;
}

/**
 * Public interface exposed by the SDK client.
 *
 * The client reads server-authoritative assignments and exposes small lookup
 * methods to the host application. It does not perform client-side bucketing.
 */
export interface ABClient {
  /**
   * Returns the assigned variant key for one experiment.
   *
   * Returns `null` when the client is not hydrated yet or when the experiment
   * does not exist in the current assignment map.
   */
  getVariant(experimentKey: string): string | null;

  /**
   * Returns the full experiment-to-variant assignment map.
   *
   * When the client has not been hydrated yet, an empty object is returned.
   */
  all(): AssignmentMap;

  /**
   * Indicates whether an assignment exists for the provided experiment key.
   */
  has(experimentKey: string): boolean;

  /**
   * Indicates whether the client currently holds hydrated server assignments.
   */
  isHydrated(): boolean;

  /**
   * Returns the identity of the unit associated with the current assignments.
   *
   * Returns `null` when the client is not hydrated yet.
   */
  unit(): UnitIdentity | null;

  /**
   * Replaces the client's in-memory state.
   *
   * Pass `null` to clear the current hydrated assignments.
   */
  replace(assignments: HydratedAssignments | null): void;

  /**
   * Hydrates the client from the configured SSR meta tag.
   *
   * Returns the normalized hydrated state or `null` when the tag is not found.
   */
  hydrateFromMeta(name?: string): HydratedAssignments | null;

  /**
   * Hydrates the client from the server assignments endpoint.
   *
   * The response is normalized into `HydratedAssignments` and stored as the
   * client's new authoritative in-memory state.
   */
  hydrateFromApi(params: HydrateFromApiParams): Promise<HydratedAssignments>;
}
