/**
 * Base SDK error.
 *
 * All custom package errors extend this class so consumers can catch one base
 * error type when integrating with the SDK.
 */
export class ABTestingError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ABTestingError";
  }
}

/**
 * Raised when a DOM or HTTP payload cannot be parsed into the expected shape.
 */
export class ABTestingParseError extends ABTestingError {
  public constructor(message: string) {
    super(message);
    this.name = "ABTestingParseError";
  }
}

/**
 * Raised when the assignments API responds with a non-success status code.
 */
export class ABTestingFetchError extends ABTestingError {
  /** HTTP status code returned by the failed request. */
  public readonly status: number;

  public constructor(message: string, status: number) {
    super(message);
    this.name = "ABTestingFetchError";
    this.status = status;
  }
}
