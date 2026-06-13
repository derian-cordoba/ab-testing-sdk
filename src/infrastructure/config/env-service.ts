import type {
  ABClientOptions,
  UnitIdentity,
} from "../../domain/contracts/ab-client.js";
import type {
  DotenvLoadOptions,
  DotenvLoadResult,
  EnvServiceOptions,
  EnvSource,
  FeatureFlagsAdminClientEnvOptions,
  SDKEnvironmentConfig,
} from "../../domain/contracts/sdk-config.js";
import { DEFAULT_META_NAME } from "../browser/read-assignments-from-meta.js";
import {
  DEFAULT_ACCEPT_HEADER,
  DEFAULT_ASSIGNMENTS_ENDPOINT,
} from "../http/api-config.js";
import {
  DEFAULT_FEATURE_FLAGS_ENDPOINT,
  DEFAULT_JSON_CONTENT_TYPE,
} from "../http/feature-flags-api-config.js";

const DEFAULT_ENV_PREFIX = "AB_TESTING_";

/**
 * Reads SDK runtime configuration from environment variables.
 *
 * This service centralizes environment parsing so applications can build SDK
 * clients from one consistent source instead of scattering `process.env` or
 * `import.meta.env` reads throughout their code.
 */
export class EnvService {
  private readonly source: EnvSource;
  private readonly prefix: string;

  /**
   * Creates a new environment configuration service.
   */
  public constructor(options: EnvServiceOptions = {}) {
    this.source = options.source ?? EnvService.readProcessEnv();
    this.prefix = options.prefix ?? DEFAULT_ENV_PREFIX;
  }

  /**
   * Returns the resolved SDK runtime configuration.
   */
  public loadConfig(): SDKEnvironmentConfig {
    return {
      endpoint: this.resolveEndpoint("ASSIGNMENTS_PATH", DEFAULT_ASSIGNMENTS_ENDPOINT),
      featureFlagsEndpoint: this.resolveEndpoint(
        "FEATURE_FLAGS_PATH",
        DEFAULT_FEATURE_FLAGS_ENDPOINT,
      ),
      acceptHeader: this.readValue("ACCEPT_HEADER") ?? DEFAULT_ACCEPT_HEADER,
      metaName: this.readValue("META_NAME") ?? DEFAULT_META_NAME,
      unit: this.loadUnitIdentity(),
    };
  }

  /**
   * Builds `createABClient()` options from the current environment.
   */
  public loadClientOptions(): ABClientOptions {
    const config = this.loadConfig();

    return {
      endpoint: config.endpoint,
      acceptHeader: config.acceptHeader,
      metaName: config.metaName,
    };
  }

  /**
   * Builds feature flags admin client options from the current environment.
   */
  public loadFeatureFlagsAdminClientOptions(): FeatureFlagsAdminClientEnvOptions {
    const config = this.loadConfig();

    return {
      endpoint: config.featureFlagsEndpoint,
      acceptHeader: config.acceptHeader,
      contentType: DEFAULT_JSON_CONTENT_TYPE,
    };
  }

  /**
   * Reads the optional fallback unit identity from the environment.
   *
   * Returns `null` when either value is missing.
   */
  public loadUnitIdentity(): UnitIdentity | null {
    const unitType = this.readValue("UNIT_TYPE");
    const unitKey = this.readValue("UNIT_KEY");

    if (unitType === undefined || unitKey === undefined) {
      return null;
    }

    return {
      unitType,
      unitKey,
    };
  }

  /**
   * Returns one raw SDK variable value after trimming empty strings.
   */
  public get(key: string): string | undefined {
    return this.readValue(key);
  }

  /**
   * Reads SDK configuration from `process.env` when available.
   */
  public static fromProcessEnv(prefix?: string): EnvService {
    const options: EnvServiceOptions = {
      source: EnvService.readProcessEnv(),
    };

    if (prefix !== undefined) {
      options.prefix = prefix;
    }

    return new EnvService(options);
  }

  /**
   * Creates a service from any explicit key/value source such as
   * `import.meta.env` in Vite or a test double.
   */
  public static fromSource(source: EnvSource, prefix?: string): EnvService {
    const options: EnvServiceOptions = { source };

    if (prefix !== undefined) {
      options.prefix = prefix;
    }

    return new EnvService(options);
  }

  private resolveEndpoint(pathKey: string, fallbackPath: string): string {
    const apiBaseUrl = this.trimTrailingSlashes(this.readValue("API_BASE_URL"));
    const path = this.readValue(pathKey) ?? fallbackPath;

    if (apiBaseUrl === undefined) {
      return path;
    }

    if (/^https?:\/\//u.test(path)) {
      return path;
    }

    return `${apiBaseUrl}${this.normalizePath(path)}`;
  }

  private readValue(key: string): string | undefined {
    const value = this.source[`${this.prefix}${key}`];

    if (typeof value !== "string") {
      return undefined;
    }

    const trimmed = value.trim();

    return trimmed === "" ? undefined : trimmed;
  }

  private normalizePath(value: string): string {
    return value.startsWith("/") ? value : `/${value}`;
  }

  private trimTrailingSlashes(value: string | undefined): string | undefined {
    return value?.replace(/\/+$/u, "");
  }

  private static readProcessEnv(): EnvSource {
    const processLike = globalThis as typeof globalThis & {
      process?: { env?: Record<string, string | undefined> };
    };

    return processLike.process?.env ?? {};
  }
}

/**
 * Loads variables from a dotenv file into the current process environment.
 *
 * This helper is intended for Node.js and SSR entrypoints before the SDK client
 * is created. Browser-only applications should rely on their bundler's env
 * injection mechanism instead.
 */
export async function configureDotenv(
  options: DotenvLoadOptions = {}
): Promise<DotenvLoadResult> {
  const dotenv = await import("dotenv");
  const dotenvOptions: {
    path?: string;
    override?: boolean;
    processEnv?: EnvSource;
  } = {};

  if (options.path !== undefined) {
    dotenvOptions.path = options.path;
  }

  if (options.override !== undefined) {
    dotenvOptions.override = options.override;
  }

  if (options.processEnv !== undefined) {
    dotenvOptions.processEnv = options.processEnv;
  }

  const result = dotenv.config(dotenvOptions);

  return {
    loaded: result.error === undefined && result.parsed !== undefined,
    parsed: result.parsed ?? {},
  };
}
