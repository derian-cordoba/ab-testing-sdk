import { afterEach, describe, expect, it } from "vitest";
import { ABTestingParseError } from "../../src/domain/errors/ab-testing-error.js";
import {
  DEFAULT_META_NAME,
  readAssignmentsFromMeta,
} from "../../src/infrastructure/browser/read-assignments-from-meta.js";

function installDocument(content: string | null, name = DEFAULT_META_NAME): void {
  (globalThis as Record<string, unknown>).document = {
    querySelector(selector: string) {
      if (selector !== `meta[name="${name}"]`) {
        return null;
      }

      if (content === null) {
        return null;
      }

      return {
        getAttribute(attribute: string) {
          return attribute === "content" ? content : null;
        },
      };
    },
  };
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).document;
});

describe("readAssignmentsFromMeta", () => {
  it("returns null outside the browser or when the tag is missing", () => {
    expect(readAssignmentsFromMeta()).toBeNull();

    installDocument(null);
    expect(readAssignmentsFromMeta()).toBeNull();
  });

  it("returns normalized hydrated assignments", () => {
    installDocument('{"unit_type":"user","unit_key":"42","assignments":{"checkout":"green"}}');

    expect(readAssignmentsFromMeta()).toEqual({
      unitType: "user",
      unitKey: "42",
      assignments: { checkout: "green" },
      source: "meta",
    });
  });

  it("rejects malformed JSON", () => {
    installDocument("{bad-json");

    expect(() => readAssignmentsFromMeta()).toThrow(ABTestingParseError);
  });

  it("rejects invalid payload shapes", () => {
    installDocument('{"unit_type":"user"}');

    expect(() => readAssignmentsFromMeta()).toThrow(ABTestingParseError);
  });
});
