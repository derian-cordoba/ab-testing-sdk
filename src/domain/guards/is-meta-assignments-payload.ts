import type { MetaAssignmentsPayload } from "../contracts/ab-client.js";
import { isAssignmentMap } from "./is-assignment-map.js";

/**
 * Validates that a decoded meta payload matches the SSR bootstrap contract.
 */
export function isMetaAssignmentsPayload(
  value: unknown,
): value is MetaAssignmentsPayload {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const payload: Partial<MetaAssignmentsPayload> = value;

  return (
    typeof payload.unit_type === "string" &&
    typeof payload.unit_key === "string" &&
    isAssignmentMap(payload.assignments)
  );
}
