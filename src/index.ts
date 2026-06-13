export {
  createABClient,
  createABClientFromEnv,
  createClient,
  createClientFromEnv,
} from "./application/factories/create-ab-client.js";
export {
  ABTestingError,
  ABTestingFetchError,
  ABTestingParseError,
} from "./domain/errors/ab-testing-error.js";
export { normalizeAssignmentsDocument } from "./infrastructure/http/normalize-assignments-document.js";
export { normalizeFeatureFlagCollectionDocument } from "./infrastructure/http/normalize-feature-flag-collection-document.js";
export { normalizeFeatureFlagDocument } from "./infrastructure/http/normalize-feature-flag-document.js";
export { DEFAULT_META_NAME, readAssignmentsFromMeta } from "./infrastructure/browser/read-assignments-from-meta.js";
export { EnvService, configureDotenv } from "./infrastructure/config/env-service.js";
export type {
  ABClient,
  ABClientOptions,
  AssignmentMap,
  HydrateFromApiParams,
  HydratedAssignments,
  UnitIdentity,
  JsonApiAssignmentsDocument,
  MetaAssignmentsPayload,
} from "./domain/contracts/ab-client.js";
export type {
  CreateFeatureFlagParams,
  FeatureFlag,
  FeatureFlagCollection,
  FeatureFlagCondition,
  FeatureFlagConditionsLogic,
  FeatureFlagsAdminClient,
  FeatureFlagsAdminClientOptions,
  JsonApiFeatureFlagCollectionDocument,
  JsonApiFeatureFlagDocument,
  ListFeatureFlagsParams,
  SetFeatureFlagConditionsParams,
  SetFeatureFlagRolloutParams,
} from "./domain/contracts/feature-flags-admin-client.js";
export type {
  ABTestingClient,
  ABTestingClientOptions,
} from "./domain/contracts/ab-testing-client.js";
export type {
  ABTestingClientEnvOptions,
  DotenvLoadOptions,
  DotenvLoadResult,
  EnvServiceOptions,
  EnvSource,
  FeatureFlagsAdminClientEnvOptions,
  SDKEnvironmentConfig,
} from "./domain/contracts/sdk-config.js";
