// @vitest-environment jsdom
import React from "react";
import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  createClient,
} from "../../src/application/factories/create-ab-client.js";
import {
  ABProvider,
  FeatureFlagsAdminProvider,
  useABClient,
  useFeatureFlagsAdminClient,
} from "../../src/presentation/react/index.js";

describe("React adapter", () => {
  it("provides the client through ABProvider", () => {
    const client = createClient();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ABProvider client={client}>{children}</ABProvider>
    );

    const { result } = renderHook(() => useABClient(), { wrapper });

    expect(result.current).toBe(client);
  });

  it("throws when the hook is used outside the provider", () => {
    expect(() => renderHook(() => useABClient())).toThrow(
      "ABProvider is missing from the React tree.",
    );
  });

  it("provides the feature flags admin client through FeatureFlagsAdminProvider", () => {
    const client = createClient();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FeatureFlagsAdminProvider client={client}>
        {children}
      </FeatureFlagsAdminProvider>
    );

    const { result } = renderHook(() => useFeatureFlagsAdminClient(), {
      wrapper,
    });

    expect(result.current).toBe(client);
  });

  it("throws when the feature flags admin hook is used outside the provider", () => {
    expect(() => renderHook(() => useFeatureFlagsAdminClient())).toThrow(
      "FeatureFlagsAdminProvider is missing from the React tree.",
    );
  });
});
