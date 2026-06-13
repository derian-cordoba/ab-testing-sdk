/**
 * Validates that a value is a plain string-to-string assignment map.
 */
export function isAssignmentMap(value: unknown): value is Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((entry) => typeof entry === "string");
}
