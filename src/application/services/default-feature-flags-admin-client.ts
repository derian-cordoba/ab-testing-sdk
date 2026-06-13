import type {
  CreateFeatureFlagParams,
  FeatureFlag,
  FeatureFlagsAdminClient,
  FeatureFlagsAdminClientOptions,
  JsonApiFeatureFlagCollectionDocument,
  JsonApiFeatureFlagDocument,
  ListFeatureFlagsParams,
  SetFeatureFlagConditionsParams,
  SetFeatureFlagRolloutParams,
} from "../../domain/contracts/feature-flags-admin-client.js";
import {
  ABTestingError,
  ABTestingFetchError,
} from "../../domain/errors/ab-testing-error.js";
import { DEFAULT_ACCEPT_HEADER } from "../../infrastructure/http/api-config.js";
import {
  DEFAULT_FEATURE_FLAGS_ENDPOINT,
  DEFAULT_JSON_CONTENT_TYPE,
} from "../../infrastructure/http/feature-flags-api-config.js";
import { normalizeFeatureFlagCollectionDocument } from "../../infrastructure/http/normalize-feature-flag-collection-document.js";
import { normalizeFeatureFlagDocument } from "../../infrastructure/http/normalize-feature-flag-document.js";
import {
  requestFeatureFlagUrl,
  requestFeatureFlagsUrl,
} from "../../infrastructure/http/request-feature-flag-url.js";

/**
 * Default fetch-based implementation of the feature flags admin client.
 */
export class DefaultFeatureFlagsAdminClient implements FeatureFlagsAdminClient {
  private readonly endpoint: string;
  private readonly acceptHeader: string;
  private readonly contentType: string;
  private readonly fetchImpl: typeof fetch | undefined;

  /**
   * Creates a new feature flags admin client.
   */
  public constructor(options: FeatureFlagsAdminClientOptions = {}) {
    this.endpoint = options.endpoint ?? DEFAULT_FEATURE_FLAGS_ENDPOINT;
    this.acceptHeader = options.acceptHeader ?? DEFAULT_ACCEPT_HEADER;
    this.contentType = options.contentType ?? DEFAULT_JSON_CONTENT_TYPE;
    this.fetchImpl = options.fetchImpl;
  }

  /** @inheritdoc */
  public async listFeatureFlags(params: ListFeatureFlagsParams = {}) {
    const response = await this.request(
      requestFeatureFlagsUrl(this.endpoint, params),
      { method: "GET" }
    );
    const body: JsonApiFeatureFlagCollectionDocument = await response.json();

    return normalizeFeatureFlagCollectionDocument(body);
  }

  /** @inheritdoc */
  public async getFeatureFlag(key: string): Promise<FeatureFlag> {
    return this.requestFeatureFlagDocument(
      requestFeatureFlagUrl(this.endpoint, key),
      {
        method: "GET",
      }
    );
  }

  /** @inheritdoc */
  public async createFeatureFlag(
    params: CreateFeatureFlagParams
  ): Promise<FeatureFlag> {
    const body: Record<string, unknown> = {
      key: params.key,
    };

    if (params.isEnabled !== undefined) {
      body.is_enabled = params.isEnabled;
    }

    if (params.rolloutPercentage !== undefined) {
      body.rollout_percentage = params.rolloutPercentage;
    }

    return this.requestFeatureFlagDocument(this.endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /** @inheritdoc */
  public async deleteFeatureFlag(key: string): Promise<void> {
    await this.request(requestFeatureFlagUrl(this.endpoint, key), {
      method: "DELETE",
    });
  }

  /** @inheritdoc */
  public async enableFeatureFlag(key: string): Promise<FeatureFlag> {
    return this.requestFeatureFlagDocument(
      requestFeatureFlagUrl(this.endpoint, key, "enable"),
      { method: "POST" }
    );
  }

  /** @inheritdoc */
  public async disableFeatureFlag(key: string): Promise<FeatureFlag> {
    return this.requestFeatureFlagDocument(
      requestFeatureFlagUrl(this.endpoint, key, "disable"),
      { method: "POST" }
    );
  }

  /** @inheritdoc */
  public async setFeatureFlagRollout(
    key: string,
    params: SetFeatureFlagRolloutParams
  ): Promise<FeatureFlag> {
    return this.requestFeatureFlagDocument(
      requestFeatureFlagUrl(this.endpoint, key, "rollout"),
      {
        method: "POST",
        body: JSON.stringify({
          rollout_percentage: params.rolloutPercentage,
        }),
      }
    );
  }

  /** @inheritdoc */
  public async activateFeatureFlagKillSwitch(
    key: string
  ): Promise<FeatureFlag> {
    return this.requestFeatureFlagDocument(
      requestFeatureFlagUrl(this.endpoint, key, "kill-switch"),
      {
        method: "POST",
        body: JSON.stringify({ is_killed: true }),
      }
    );
  }

  /** @inheritdoc */
  public async deactivateFeatureFlagKillSwitch(
    key: string
  ): Promise<FeatureFlag> {
    return this.requestFeatureFlagDocument(
      requestFeatureFlagUrl(this.endpoint, key, "kill-switch/deactivate"),
      { method: "POST" }
    );
  }

  /** @inheritdoc */
  public async setFeatureFlagConditions(
    key: string,
    params: SetFeatureFlagConditionsParams
  ): Promise<FeatureFlag> {
    const body: Record<string, unknown> = {
      conditions: params.conditions,
    };

    if (params.conditionsLogic !== undefined) {
      body.conditions_logic = params.conditionsLogic;
    }

    return this.requestFeatureFlagDocument(
      requestFeatureFlagUrl(this.endpoint, key, "conditions"),
      {
        method: "POST",
        body: JSON.stringify(body),
      }
    );
  }

  /** @inheritdoc */
  public async clearFeatureFlagConditions(key: string): Promise<void> {
    await this.request(
      requestFeatureFlagUrl(this.endpoint, key, "conditions"),
      {
        method: "DELETE",
      }
    );
  }

  private async requestFeatureFlagDocument(
    url: string,
    init: RequestInit
  ): Promise<FeatureFlag> {
    const response = await this.request(url, init);
    const body: JsonApiFeatureFlagDocument = await response.json();

    return normalizeFeatureFlagDocument(body);
  }

  private async request(url: string, init: RequestInit): Promise<Response> {
    const fetchImpl = this.resolveFetch();
    const response = await fetchImpl(url, {
      ...init,
      headers: {
        Accept: this.acceptHeader,
        ...this.resolveBodyHeaders(init),
      },
    });

    if (!response.ok) {
      throw new ABTestingFetchError(
        `Feature flags API request failed. Received HTTP ${response.status}.`,
        response.status
      );
    }

    return response;
  }

  private resolveBodyHeaders(init: RequestInit): Record<string, string> {
    return init.body === undefined ? {} : { "Content-Type": this.contentType };
  }

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
