import { describe, expect, it } from "vitest";
import {
  ABTestingError,
  ABTestingFetchError,
  ABTestingParseError,
} from "../../src/domain/errors/ab-testing-error.js";

describe("errors", () => {
  it("preserves base error message and name", () => {
    const error = new ABTestingError("base");

    expect(error.message).toBe("base");
    expect(error.name).toBe("ABTestingError");
  });

  it("creates parse errors as ABTestingError children", () => {
    const error = new ABTestingParseError("parse");

    expect(error.message).toBe("parse");
    expect(error.name).toBe("ABTestingParseError");
    expect(error).toBeInstanceOf(ABTestingError);
  });

  it("creates fetch errors with an HTTP status", () => {
    const error = new ABTestingFetchError("fetch", 422);

    expect(error.message).toBe("fetch");
    expect(error.name).toBe("ABTestingFetchError");
    expect(error.status).toBe(422);
    expect(error).toBeInstanceOf(ABTestingError);
  });
});
