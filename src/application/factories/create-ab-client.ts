import type { ABClient, ABClientOptions } from "../../domain/contracts/ab-client.js";
import { DefaultABClient } from "../services/default-ab-client.js";

/**
 * Creates the default SDK client implementation.
 *
 * This is the main factory third-party consumers should call when bootstrapping
 * the package in browser code, SSR hydration code, or framework adapters.
 */
export function createABClient(options: ABClientOptions = {}): ABClient {
  return new DefaultABClient(options);
}
