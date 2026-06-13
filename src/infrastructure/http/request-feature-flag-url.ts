import type { ListFeatureFlagsParams } from "../../domain/contracts/feature-flags-admin-client.js";

/**
 * Builds the feature flags collection URL with optional query parameters.
 */
export function requestFeatureFlagsUrl(
  endpoint: string,
  params: ListFeatureFlagsParams = {},
): string {
  const query = new URLSearchParams();

  if (params.isEnabled !== undefined) {
    query.set("is_enabled", params.isEnabled ? "1" : "0");
  }

  const queryString = query.toString();

  if (queryString === "") {
    return endpoint;
  }

  const separator = endpoint.includes("?") ? "&" : "?";

  return `${endpoint}${separator}${queryString}`;
}

/**
 * Builds the feature flag resource or action URL for one key.
 */
export function requestFeatureFlagUrl(
  endpoint: string,
  key: string,
  actionPath = "",
): string {
  const normalizedActionPath = actionPath === "" ? "" : `/${actionPath.replace(/^\/+/u, "")}`;

  return `${endpoint}/${encodeURIComponent(key)}${normalizedActionPath}`;
}
