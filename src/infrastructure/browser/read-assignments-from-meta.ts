import type { HydratedAssignments } from "../../domain/contracts/ab-client.js";
import { ABTestingParseError } from "../../domain/errors/ab-testing-error.js";
import { isMetaAssignmentsPayload } from "../../domain/guards/is-meta-assignments-payload.js";

/** Default DOM meta tag name used for SSR bootstrap. */
export const DEFAULT_META_NAME = "ab-testing:assignments";

/**
 * Reads hydrated assignments from a server-rendered `<meta>` tag.
 *
 * The function returns `null` when the tag does not exist or when called in a
 * non-browser runtime. Invalid JSON or an invalid payload shape throws an
 * `ABTestingParseError`.
 */
export function readAssignmentsFromMeta(
  name = DEFAULT_META_NAME,
): HydratedAssignments | null {
  if (typeof document === "undefined") {
    return null;
  }

  const element = document.querySelector(`meta[name="${name}"]`);
  const content = element?.getAttribute("content");

  if (!content || content === "") {
    return null;
  }

  const parsed = parseJSON(content);

  if (!isMetaAssignmentsPayload(parsed)) {
    throw new ABTestingParseError("Invalid assignments meta payload shape.");
  }

  return {
    unitType: parsed.unit_type,
    unitKey: parsed.unit_key,
    assignments: parsed.assignments,
    source: "meta",
  };
}

/**
 * Parses the raw string value of the meta `content` attribute.
 */
function parseJSON(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    throw new ABTestingParseError("Invalid assignments meta JSON payload.");
  }
}
