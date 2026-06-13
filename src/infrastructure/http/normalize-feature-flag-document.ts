import type {
  FeatureFlag,
  FeatureFlagCondition,
  FeatureFlagConditionsLogic,
  JsonApiFeatureFlagDocument,
} from "../../domain/contracts/feature-flags-admin-client.js";
import { ABTestingParseError } from "../../domain/errors/ab-testing-error.js";

/**
 * Normalizes one feature flag JSON:API document into the SDK's admin model.
 */
export function normalizeFeatureFlagDocument(
  input: JsonApiFeatureFlagDocument,
): FeatureFlag {
  return normalizeFeatureFlagResource(input.data);
}

/**
 * Normalizes one feature flag JSON:API resource object into the SDK's admin model.
 */
export function normalizeFeatureFlagResource(
  input: JsonApiFeatureFlagDocument["data"],
): FeatureFlag {
  const attributes = input?.attributes;

  if (
    input?.type !== "feature-flags" ||
    typeof input.id !== "string" ||
    typeof attributes?.is_enabled !== "boolean" ||
    typeof attributes?.rollout_percentage !== "number" ||
    !isFeatureFlagConditions(attributes?.conditions) ||
    !isFeatureFlagConditionsLogic(attributes?.conditions_logic) ||
    typeof attributes?.is_killed !== "boolean" ||
    !isNullableString(attributes?.killed_at) ||
    !isNullableString(attributes?.last_evaluated_at) ||
    !isNullableString(attributes?.created_at) ||
    !isNullableString(attributes?.updated_at)
  ) {
    throw new ABTestingParseError("Invalid JSON:API feature flag document.");
  }

  return {
    key: input.id,
    isEnabled: attributes.is_enabled,
    rolloutPercentage: attributes.rollout_percentage,
    conditions: attributes.conditions,
    conditionsLogic: attributes.conditions_logic,
    isKilled: attributes.is_killed,
    killedAt: attributes.killed_at,
    lastEvaluatedAt: attributes.last_evaluated_at,
    createdAt: attributes.created_at,
    updatedAt: attributes.updated_at,
  };
}

function isFeatureFlagConditions(value: unknown): value is FeatureFlagCondition[] {
  if (!Array.isArray(value)) {
    return false;
  }

  return value.every((condition) => {
    if (typeof condition !== "object" || condition === null || Array.isArray(condition)) {
      return false;
    }

    const record = condition as Record<string, unknown>;

    return (
      typeof record.attribute === "string" &&
      typeof record.operator === "string" &&
      Object.hasOwn(record, "expected")
    );
  });
}

function isFeatureFlagConditionsLogic(
  value: unknown,
): value is FeatureFlagConditionsLogic | null {
  return value === null || value === "all" || value === "any";
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}
