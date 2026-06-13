import { describe, expect, it, vi } from "vitest";
import { createABClient } from "../../src/application/factories/create-ab-client.js";
import {
  ABTestingError,
  ABTestingFetchError,
} from "../../src/domain/errors/ab-testing-error.js";

function makeClient() {
  return createABClient({
    initial: {
      unitType: "user",
      unitKey: "42",
      assignments: {
        checkout: "green",
      },
      source: "meta",
    },
  });
}

describe("DefaultABClient", () => {
  it("exposes hydrated variant lookups and unit metadata", () => {
    const client = makeClient();

    expect(client.isHydrated()).toBe(true);
    expect(client.getVariant("checkout")).toBe("green");
    expect(client.getVariant("missing")).toBeNull();
    expect(client.has("checkout")).toBe(true);
    expect(client.has("missing")).toBe(false);
    expect(client.all()).toEqual({ checkout: "green" });
    expect(client.unit()).toEqual({ unitType: "user", unitKey: "42" });
  });

  it("replace swaps the current state", () => {
    const client = makeClient();

    client.replace(null);

    expect(client.isHydrated()).toBe(false);
    expect(client.all()).toEqual({});
    expect(client.unit()).toBeNull();
  });

  it("hydrateFromMeta stores normalized state", () => {
    (globalThis as Record<string, unknown>).document = {
      querySelector() {
        return {
          getAttribute() {
            return '{"unit_type":"tenant","unit_key":"t-1","assignments":{"hero":"control"}}';
          },
        };
      },
    };

    const client = createABClient();
    const hydrated = client.hydrateFromMeta();

    expect(hydrated).toEqual({
      unitType: "tenant",
      unitKey: "t-1",
      assignments: { hero: "control" },
      source: "meta",
    });
    expect(client.unit()).toEqual({ unitType: "tenant", unitKey: "t-1" });

    delete (globalThis as Record<string, unknown>).document;
  });

  it("hydrateFromApi fetches, normalizes, and stores state", async () => {
    const client = createABClient({
      assignmentsEndpoint: "/api/v1/ab-testing/assignments",
      fetchImpl: async (input, init) => {
        expect(input).toBe(
          "/api/v1/ab-testing/assignments?unit_type=user&unit_key=99",
        );
        expect(init).toEqual({
          headers: {
            Accept: "application/vnd.ab-testing.v1+json",
          },
        });

        return new Response(
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
        );
      },
    });

    const hydrated = await client.hydrateFromApi({
      unitType: "user",
      unitKey: "99",
    });

    expect(hydrated).toEqual({
      unitType: "user",
      unitKey: "99",
      assignments: { hero: "variant" },
      source: "api",
    });
    expect(client.getVariant("hero")).toBe("variant");
  });

  it("reuses assignment responses when cache is enabled", async () => {
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

    const client = createABClient({
      cache: true,
      fetchImpl,
    });

    await client.hydrateFromApi({ unitType: "user", unitKey: "99" });
    const hydrated = await client.hydrateFromApi({ unitType: "user", unitKey: "99" });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(hydrated.assignments).toEqual({ hero: "variant" });
  });

  it("clears cached assignment responses explicitly", async () => {
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

    const client = createABClient({
      cache: true,
      fetchImpl,
    });

    await client.hydrateFromApi({ unitType: "user", unitKey: "99" });
    client.clearCache();
    await client.hydrateFromApi({ unitType: "user", unitKey: "99" });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("hydrateFromApi throws on non-success status", async () => {
    const client = createABClient({
      fetchImpl: async () => new Response("nope", { status: 500 }),
    });

    await expect(
      client.hydrateFromApi({ unitType: "user", unitKey: "1" }),
    ).rejects.toBeInstanceOf(ABTestingFetchError);
  });

  it("hydrateFromApi throws when no fetch implementation exists", async () => {
    const originalFetch = globalThis.fetch;
    // @ts-expect-error intentional test mutation
    delete globalThis.fetch;

    const client = createABClient();

    await expect(
      client.hydrateFromApi({ unitType: "user", unitKey: "1" }),
    ).rejects.toBeInstanceOf(ABTestingError);

    globalThis.fetch = originalFetch;
  });
});
