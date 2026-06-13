import { describe, expect, it, vi } from "vitest";
import { createABClient } from "../../src/application/factories/create-ab-client.js";
import { ABTestingFetchError, ABTestingParseError } from "../../src/domain/errors/ab-testing-error.js";
import { normalizeFeatureFlagCollectionDocument } from "../../src/infrastructure/http/normalize-feature-flag-collection-document.js";
import { normalizeFeatureFlagDocument } from "../../src/infrastructure/http/normalize-feature-flag-document.js";
import {
  requestFeatureFlagUrl,
  requestFeatureFlagsUrl,
} from "../../src/infrastructure/http/request-feature-flag-url.js";

describe("feature flags admin helpers", () => {
  it("builds the feature flags collection URL with filters", () => {
    expect(
      requestFeatureFlagsUrl("/api/v1/ab-testing/feature-flags", {
        isEnabled: true,
      }),
    ).toBe("/api/v1/ab-testing/feature-flags?is_enabled=1");
  });

  it("builds the feature flag action URL", () => {
    expect(
      requestFeatureFlagUrl(
        "/api/v1/ab-testing/feature-flags",
        "dark mode",
        "kill-switch/deactivate",
      ),
    ).toBe(
      "/api/v1/ab-testing/feature-flags/dark%20mode/kill-switch/deactivate",
    );
  });

  it("normalizes a feature flag document", () => {
    const result = normalizeFeatureFlagDocument({
      data: {
        id: "dark-mode",
        type: "feature-flags",
        attributes: {
          is_enabled: true,
          rollout_percentage: 25,
          conditions: [
            { attribute: "plan", operator: "equals", expected: "pro" },
          ],
          conditions_logic: "all",
          is_killed: false,
          killed_at: null,
          last_evaluated_at: null,
          created_at: null,
          updated_at: null,
        },
      },
    });

    expect(result).toEqual({
      key: "dark-mode",
      isEnabled: true,
      rolloutPercentage: 25,
      conditions: [
        { attribute: "plan", operator: "equals", expected: "pro" },
      ],
      conditionsLogic: "all",
      isKilled: false,
      killedAt: null,
      lastEvaluatedAt: null,
      createdAt: null,
      updatedAt: null,
    });
  });

  it("normalizes a feature flag collection document", () => {
    const result = normalizeFeatureFlagCollectionDocument({
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
      meta: {
        current_page: 1,
      },
    });

    expect(result.items).toHaveLength(1);
    expect(result.meta).toEqual({ current_page: 1 });
  });

  it("rejects invalid feature flag JSON:API documents", () => {
    expect(() =>
      normalizeFeatureFlagDocument({
        data: {
          id: "dark-mode",
          type: "wrong",
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
      } as unknown as Parameters<typeof normalizeFeatureFlagDocument>[0]),
    ).toThrow(ABTestingParseError);
  });
});

describe("DefaultFeatureFlagsAdminClient", () => {
  it("supports the feature flag lifecycle and CRUD endpoints", async () => {
    const calls: { input: RequestInfo | URL; init: RequestInit | undefined }[] = [];
    const client = createABClient({
      featureFlagsEndpoint: "/api/v1/ab-testing/feature-flags",
      fetchImpl: async (input, init) => {
        calls.push({ input, init });
        const url = String(input);

        if (url === "/api/v1/ab-testing/feature-flags?is_enabled=0") {
          return jsonResponse({
            data: [
              {
                id: "dark-mode",
                type: "feature-flags",
                attributes: {
                  is_enabled: false,
                  rollout_percentage: 100,
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
          });
        }

        if (url === "/api/v1/ab-testing/feature-flags/dark-mode" && init?.method === "GET") {
          return jsonResponse(singleFlagPayload({ is_enabled: false }));
        }

        if (url === "/api/v1/ab-testing/feature-flags" && init?.method === "POST") {
          expect(init.headers).toEqual({
            Accept: "application/vnd.ab-testing.v1+json",
            "Content-Type": "application/json",
          });

          return jsonResponse(singleFlagPayload({ is_enabled: true, rollout_percentage: 10 }), 201);
        }

        if (url === "/api/v1/ab-testing/feature-flags/dark-mode/enable") {
          return jsonResponse(singleFlagPayload({ is_enabled: true }));
        }

        if (url === "/api/v1/ab-testing/feature-flags/dark-mode/disable") {
          return jsonResponse(singleFlagPayload({ is_enabled: false }));
        }

        if (url === "/api/v1/ab-testing/feature-flags/dark-mode/rollout") {
          return jsonResponse(singleFlagPayload({ rollout_percentage: 25 }));
        }

        if (url === "/api/v1/ab-testing/feature-flags/dark-mode/kill-switch") {
          return jsonResponse(singleFlagPayload({ is_killed: true, killed_at: "2026-01-01T00:00:00Z" }));
        }

        if (url === "/api/v1/ab-testing/feature-flags/dark-mode/kill-switch/deactivate") {
          return jsonResponse(singleFlagPayload({ is_killed: false, killed_at: null }));
        }

        if (url === "/api/v1/ab-testing/feature-flags/dark-mode/conditions") {
          if (init?.method === "POST") {
            return jsonResponse(
              singleFlagPayload({
                conditions_logic: "any",
                conditions: [
                  { attribute: "plan", operator: "equals", expected: "pro" },
                ],
              }),
            );
          }

          return new Response(null, { status: 204 });
        }

        if (url === "/api/v1/ab-testing/feature-flags/dark-mode" && init?.method === "DELETE") {
          return new Response(null, { status: 204 });
        }

        throw new Error(`Unhandled request: ${url}`);
      },
    });

    const list = await client.listFeatureFlags({ isEnabled: false });
    const item = await client.getFeatureFlag("dark-mode");
    const created = await client.createFeatureFlag({
      key: "dark-mode",
      isEnabled: true,
      rolloutPercentage: 10,
    });
    const enabled = await client.enableFeatureFlag("dark-mode");
    const disabled = await client.disableFeatureFlag("dark-mode");
    const rolledOut = await client.setFeatureFlagRollout("dark-mode", {
      rolloutPercentage: 25,
    });
    const killed = await client.activateFeatureFlagKillSwitch("dark-mode");
    const restored = await client.deactivateFeatureFlagKillSwitch("dark-mode");
    const conditioned = await client.setFeatureFlagConditions("dark-mode", {
      conditions: [{ attribute: "plan", operator: "equals", expected: "pro" }],
      conditionsLogic: "any",
    });
    await client.clearFeatureFlagConditions("dark-mode");
    await client.deleteFeatureFlag("dark-mode");

    expect(list.items[0]?.key).toBe("dark-mode");
    expect(item.isEnabled).toBe(false);
    expect(created.rolloutPercentage).toBe(10);
    expect(enabled.isEnabled).toBe(true);
    expect(disabled.isEnabled).toBe(false);
    expect(rolledOut.rolloutPercentage).toBe(25);
    expect(killed.isKilled).toBe(true);
    expect(restored.isKilled).toBe(false);
    expect(conditioned.conditionsLogic).toBe("any");
    expect(calls).toHaveLength(11);
  });

  it("reuses cached feature flag reads and invalidates them after writes", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "/api/v1/ab-testing/feature-flags/dark-mode" && init?.method === "GET") {
        return jsonResponse(singleFlagPayload({ is_enabled: false }));
      }

      if (url === "/api/v1/ab-testing/feature-flags/dark-mode/enable") {
        return jsonResponse(singleFlagPayload({ is_enabled: true }));
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    const client = createABClient({
      featureFlagsEndpoint: "/api/v1/ab-testing/feature-flags",
      fetchImpl,
      cache: true,
    });

    const first = await client.getFeatureFlag("dark-mode");
    const second = await client.getFeatureFlag("dark-mode");
    const enabled = await client.enableFeatureFlag("dark-mode");
    const third = await client.getFeatureFlag("dark-mode");

    expect(first.isEnabled).toBe(false);
    expect(second.isEnabled).toBe(false);
    expect(enabled.isEnabled).toBe(true);
    expect(third.isEnabled).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws on failed feature flag admin requests", async () => {
    const client = createABClient({
      fetchImpl: async () => new Response("nope", { status: 500 }),
    });

    await expect(client.getFeatureFlag("dark-mode")).rejects.toBeInstanceOf(
      ABTestingFetchError,
    );
  });
});

function singleFlagPayload(
  attributes: Partial<{
    is_enabled: boolean;
    rollout_percentage: number;
    conditions: unknown[];
    conditions_logic: "all" | "any" | null;
    is_killed: boolean;
    killed_at: string | null;
    last_evaluated_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  }> = {},
) {
  return {
    data: {
      id: "dark-mode",
      type: "feature-flags" as const,
      attributes: {
        is_enabled: false,
        rollout_percentage: 100,
        conditions: [],
        conditions_logic: null,
        is_killed: false,
        killed_at: null,
        last_evaluated_at: null,
        created_at: null,
        updated_at: null,
        ...attributes,
      },
    },
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
