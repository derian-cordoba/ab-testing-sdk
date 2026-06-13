// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  createClient,
} from "../../src/application/factories/create-ab-client.js";
import {
  ABProvider,
  FeatureFlagsAdminProvider,
  useABClient,
  useAssignments,
  useFeatureFlag,
  useFeatureFlags,
  useFeatureFlagsAdminClient,
} from "../../src/presentation/react/index.js";

describe("React adapter", () => {
  it("provides the unified client through ABProvider", () => {
    const client = createClient();

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ABProvider client={client}>{children}</ABProvider>
    );

    const { result } = renderHook(() => useABClient(), { wrapper });

    expect(result.current).toBe(client);
    expect(typeof result.current.clearCache).toBe("function");
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

  it("hydrates assignments through a cache-aware hook", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            type: "assignments",
            id: "user:99",
            attributes: {
              unit_type: "user",
              unit_key: "99",
              assignments: { hero: "variant" },
            },
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    const client = createClient({ cache: true, fetchImpl });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ABProvider client={client}>{children}</ABProvider>
    );

    const first = renderHook(
      () =>
        useAssignments({
          apiParams: { unitType: "user", unitKey: "99" },
          hydrateFromApiOnMount: true,
        }),
      { wrapper },
    );

    await waitFor(() => expect(first.result.current.isHydrated).toBe(true));
    expect(first.result.current.assignments).toEqual({ hero: "variant" });

    first.unmount();

    const second = renderHook(
      () =>
        useAssignments({
          apiParams: { unitType: "user", unitKey: "99" },
          hydrateFromApiOnMount: true,
        }),
      { wrapper },
    );

    await waitFor(() => expect(second.result.current.isHydrated).toBe(true));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("loads one feature flag through a cache-aware hook", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            id: "dark-mode",
            type: "feature-flags",
            attributes: {
              is_enabled: true,
              rollout_percentage: 25,
              conditions: [],
              conditions_logic: null,
              is_killed: false,
              killed_at: null,
              last_evaluated_at: null,
              created_at: null,
              updated_at: null,
            },
          },
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    const client = createClient({ cache: true, fetchImpl });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ABProvider client={client}>{children}</ABProvider>
    );

    const first = renderHook(() => useFeatureFlag("dark-mode"), { wrapper });

    await waitFor(() => expect(first.result.current.flag?.key).toBe("dark-mode"));

    first.unmount();

    const second = renderHook(() => useFeatureFlag("dark-mode"), { wrapper });

    await waitFor(() => expect(second.result.current.flag?.key).toBe("dark-mode"));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("loads the feature flag collection through a cache-aware hook", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [
            {
              id: "dark-mode",
              type: "feature-flags",
              attributes: {
                is_enabled: true,
                rollout_percentage: 25,
                conditions: [],
                conditions_logic: null,
                is_killed: false,
                killed_at: null,
                last_evaluated_at: null,
                created_at: null,
                updated_at: null,
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );
    const client = createClient({ cache: true, fetchImpl });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ABProvider client={client}>{children}</ABProvider>
    );

    const first = renderHook(
      () => useFeatureFlags({ params: { isEnabled: true } }),
      { wrapper },
    );

    await waitFor(() => expect(first.result.current.collection?.items).toHaveLength(1));

    first.unmount();

    const second = renderHook(
      () => useFeatureFlags({ params: { isEnabled: true } }),
      { wrapper },
    );

    await waitFor(() => expect(second.result.current.collection?.items).toHaveLength(1));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
