import { describe, expect, it } from "vitest";
import { ABTestingParseError } from "../../src/domain/errors/ab-testing-error.js";
import { normalizeAssignmentsDocument } from "../../src/infrastructure/http/normalize-assignments-document.js";
import { requestAssignmentsUrl } from "../../src/infrastructure/http/request-assignments-url.js";

describe("http helpers", () => {
  it("builds an assignments URL for a bare endpoint", () => {
    expect(
      requestAssignmentsUrl("/api/v1/ab-testing/assignments", {
        unitType: "user",
        unitKey: "42",
      }),
    ).toBe("/api/v1/ab-testing/assignments?unit_type=user&unit_key=42");
  });

  it("builds an assignments URL for an endpoint with an existing query", () => {
    expect(
      requestAssignmentsUrl("/api/v1/ab-testing/assignments?lang=en", {
        unitType: "user",
        unitKey: "42",
      }),
    ).toBe("/api/v1/ab-testing/assignments?lang=en&unit_type=user&unit_key=42");
  });

  it("normalizes the assignments JSON:API document", () => {
    const result = normalizeAssignmentsDocument({
      data: {
        type: "assignments",
        id: "user:42",
        attributes: {
          unit_type: "user",
          unit_key: "42",
          assignments: {
            checkout: "green",
          },
        },
      },
      meta: {
        source: "server",
      },
    });

    expect(result).toEqual({
      unitType: "user",
      unitKey: "42",
      assignments: { checkout: "green" },
      source: "api",
    });
  });

  it("rejects invalid JSON:API documents", () => {
    expect(() =>
      normalizeAssignmentsDocument({
        data: {
          type: "wrong",
          id: "user:42",
          attributes: {
            unit_type: "user",
            unit_key: "42",
            assignments: { checkout: "green" },
          },
        },
      } as unknown as Parameters<typeof normalizeAssignmentsDocument>[0]),
    ).toThrow(ABTestingParseError);
  });
});
