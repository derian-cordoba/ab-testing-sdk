export { createABClient } from "./application/factories/create-ab-client.js";
export {
  ABTestingError,
  ABTestingFetchError,
  ABTestingParseError,
} from "./domain/errors/ab-testing-error.js";
export { normalizeAssignmentsDocument } from "./infrastructure/http/normalize-assignments-document.js";
export { DEFAULT_META_NAME, readAssignmentsFromMeta } from "./infrastructure/browser/read-assignments-from-meta.js";
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
