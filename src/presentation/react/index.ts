import {
  createContext,
  createElement,
  useContext,
  type ReactElement,
  type ReactNode,
} from "react";
import type { ABClient } from "../../domain/contracts/ab-client.js";

const ABClientContext = createContext<ABClient | null>(null);

/** Props accepted by the React provider wrapper. */
export interface ABProviderProps {
  /** Shared SDK client instance for the React tree. */
  client: ABClient;
  /** React children that should receive the client through context. */
  children: ReactNode;
}

/**
 * Provides one SDK client instance to a React subtree.
 */
export function ABProvider({ client, children }: ABProviderProps): ReactElement {
  return createElement(ABClientContext.Provider, { value: client }, children);
}

/**
 * Returns the SDK client from React context.
 *
 * Throws when used outside `ABProvider`.
 */
export function useABClient(): ABClient {
  const client = useContext(ABClientContext);

  if (client === null) {
    throw new Error("ABProvider is missing from the React tree.");
  }

  return client;
}
