import type { HydrateFromApiParams } from "../../domain/contracts/ab-client.js";

/**
 * Builds the final assignments endpoint URL for one unit.
 *
 * Query parameters are appended using `unit_type` and `unit_key` to match the
 * Laravel API contract.
 */
export function requestAssignmentsUrl(
  endpoint: string,
  params: HydrateFromApiParams,
): string {
  const query = new URLSearchParams({
    unit_type: params.unitType,
    unit_key: params.unitKey,
  }).toString();

  const separator = endpoint.includes("?") ? "&" : "?";

  return `${endpoint}${separator}${query}`;
}
