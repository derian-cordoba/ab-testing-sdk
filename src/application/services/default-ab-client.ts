import type {
  ABClient,
  ABClientOptions,
  AssignmentMap,
  HydrateFromApiParams,
  HydratedAssignments,
  JsonApiAssignmentsDocument,
  UnitIdentity,
} from "../../domain/contracts/ab-client.js";
import {
  ABTestingError,
  ABTestingFetchError,
} from "../../domain/errors/ab-testing-error.js";
import {
  DEFAULT_ACCEPT_HEADER,
  DEFAULT_ASSIGNMENTS_ENDPOINT,
} from "../../infrastructure/http/api-config.js";
import { normalizeAssignmentsDocument } from "../../infrastructure/http/normalize-assignments-document.js";
import { requestAssignmentsUrl } from "../../infrastructure/http/request-assignments-url.js";
import {
  DEFAULT_META_NAME,
  readAssignmentsFromMeta,
} from "../../infrastructure/browser/read-assignments-from-meta.js";

/**
 * Default in-memory implementation of the SDK client contract.
 *
 * The client keeps the server-provided assignment payload in memory and offers
 * simple lookup and hydration methods. It intentionally does not perform any
 * browser-side bucketing or persistence.
 */
export class DefaultABClient implements ABClient {
  private state: HydratedAssignments | null;
  private readonly endpoint: string;
  private readonly acceptHeader: string;
  private readonly fetchImpl: typeof fetch | undefined;
  private readonly metaName: string;

  /**
   * Creates a new client instance.
   *
   * The constructor only stores configuration and optional initial state. No
   * network request or DOM access occurs until a hydration method is called.
   */
  public constructor(options: ABClientOptions) {
    this.state = options.initial ?? null;
    this.endpoint = options.endpoint ?? DEFAULT_ASSIGNMENTS_ENDPOINT;
    this.acceptHeader = options.acceptHeader ?? DEFAULT_ACCEPT_HEADER;
    this.fetchImpl = options.fetchImpl;
    this.metaName = options.metaName ?? DEFAULT_META_NAME;
  }

  /** @inheritdoc */
  public getVariant(experimentKey: string): string | null {
    return this.state?.assignments[experimentKey] ?? null;
  }

  /** @inheritdoc */
  public all(): AssignmentMap {
    return this.state?.assignments ?? {};
  }

  /** @inheritdoc */
  public has(experimentKey: string): boolean {
    return this.getVariant(experimentKey) !== null;
  }

  /** @inheritdoc */
  public isHydrated(): boolean {
    return this.state !== null;
  }

  /** @inheritdoc */
  public unit(): UnitIdentity | null {
    if (this.state === null) {
      return null;
    }

    return {
      unitType: this.state.unitType,
      unitKey: this.state.unitKey,
    };
  }

  /** @inheritdoc */
  public replace(assignments: HydratedAssignments | null): void {
    this.state = assignments;
  }

  /** @inheritdoc */
  public hydrateFromMeta(name = this.metaName): HydratedAssignments | null {
    const hydrated = readAssignmentsFromMeta(name);

    if (hydrated !== null) {
      this.state = hydrated;
    }

    return hydrated;
  }

  /** @inheritdoc */
  public async hydrateFromApi(
    params: HydrateFromApiParams,
  ): Promise<HydratedAssignments> {
    const fetchImpl = this.resolveFetch();
    const response = await fetchImpl(requestAssignmentsUrl(this.endpoint, params), {
      headers: {
        Accept: this.acceptHeader,
      },
    });

    if (!response.ok) {
      throw new ABTestingFetchError(
        `Failed to fetch assignments. Received HTTP ${response.status}.`,
        response.status,
      );
    }

    const body: JsonApiAssignmentsDocument = await response.json();
    const hydrated = normalizeAssignmentsDocument(body);

    this.state = hydrated;

    return hydrated;
  }

  /**
   * Resolves the fetch implementation used by `hydrateFromApi()`.
   *
   * A custom implementation takes precedence. Otherwise the global runtime
   * `fetch` is used. If neither exists, the client throws a configuration error.
   */
  private resolveFetch(): typeof fetch {
    if (this.fetchImpl !== undefined) {
      return this.fetchImpl;
    }

    if (typeof fetch !== "function") {
      throw new ABTestingError("No fetch implementation is available.");
    }

    return fetch;
  }
}
