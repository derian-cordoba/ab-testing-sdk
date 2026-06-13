import type {
  FeatureFlagCollection,
  JsonApiFeatureFlagCollectionDocument,
} from "../../domain/contracts/feature-flags-admin-client.js";
import { ABTestingParseError } from "../../domain/errors/ab-testing-error.js";
import { normalizeFeatureFlagResource } from "./normalize-feature-flag-document.js";

/**
 * Normalizes the feature flags index JSON:API document into a collection model.
 */
export function normalizeFeatureFlagCollectionDocument(
  input: JsonApiFeatureFlagCollectionDocument,
): FeatureFlagCollection {
  if (!Array.isArray(input.data)) {
    throw new ABTestingParseError("Invalid JSON:API feature flag collection document.");
  }

  return {
    items: input.data.map((item) => normalizeFeatureFlagResource(item)),
    meta: isPlainObject(input.meta) ? input.meta : null,
    links: isPlainObject(input.links) ? input.links : null,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
