import { describe, expect, it } from "vitest";
import { isAssignmentMap } from "../../src/domain/guards/is-assignment-map.js";
import { isMetaAssignmentsPayload } from "../../src/domain/guards/is-meta-assignments-payload.js";

describe("guards", () => {
  it("accepts plain assignment maps", () => {
    expect(isAssignmentMap({ exp: "control", other: "green" })).toBe(true);
  });

  it("rejects invalid assignment maps", () => {
    expect(isAssignmentMap(["control"])).toBe(false);
    expect(isAssignmentMap(null)).toBe(false);
    expect(isAssignmentMap({ exp: 1 })).toBe(false);
  });

  it("accepts valid meta assignments payloads", () => {
    expect(
      isMetaAssignmentsPayload({
        unit_type: "user",
        unit_key: "42",
        assignments: { exp: "control" },
      }),
    ).toBe(true);
  });

  it("rejects malformed meta assignments payloads", () => {
    expect(isMetaAssignmentsPayload({ unit_type: "user" })).toBe(false);
    expect(
      isMetaAssignmentsPayload({
        unit_type: "user",
        unit_key: 42,
        assignments: {},
      }),
    ).toBe(false);
    expect(
      isMetaAssignmentsPayload({
        unit_type: "user",
        unit_key: "42",
        assignments: { exp: 10 },
      }),
    ).toBe(false);
  });
});
