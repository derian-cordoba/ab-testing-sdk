import type {
  HydratedAssignments,
  JsonApiAssignmentsDocument,
} from "../../domain/contracts/ab-client.js";
import { ABTestingParseError } from "../../domain/errors/ab-testing-error.js";
import { isAssignmentMap } from "../../domain/guards/is-assignment-map.js";

/**
 * Normalizes the assignments JSON:API response into the SDK's in-memory model.
 *
 * The SDK keeps HTTP wire concerns out of application code by converting the
 * raw server response into a `HydratedAssignments` value before storing it.
 */
export function normalizeAssignmentsDocument(
  input: JsonApiAssignmentsDocument,
): HydratedAssignments {
  const attributes = input.data?.attributes;

  if (
    input.data?.type !== "assignments" ||
    typeof attributes?.unit_type !== "string" ||
    typeof attributes?.unit_key !== "string" ||
    !isAssignmentMap(attributes?.assignments)
  ) {
    throw new ABTestingParseError("Invalid JSON:API assignments document.");
  }

  return {
    unitType: attributes.unit_type,
    unitKey: attributes.unit_key,
    assignments: attributes.assignments,
    source: "api",
  };
}
