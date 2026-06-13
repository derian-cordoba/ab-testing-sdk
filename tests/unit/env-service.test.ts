import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createABClient,
  createABClientFromEnv,
} from "../../src/application/factories/create-ab-client.js";
import { configureDotenv, EnvService } from "../../src/infrastructure/config/env-service.js";

afterEach(async () => {
  // no-op placeholder for future cleanup hooks
});

describe("EnvService", () => {
  it("uses SDK defaults when no environment variables are defined", () => {
    const service = EnvService.fromSource({});

    expect(service.loadConfig()).toEqual({
      assignmentsEndpoint: "/api/v1/ab-testing/assignments",
      featureFlagsEndpoint: "/api/v1/ab-testing/feature-flags",
      acceptHeader: "application/vnd.ab-testing.v1+json",
      metaName: "ab-testing:assignments",
      unit: null,
    });
  });

  it("builds a full endpoint URL from base URL and path", () => {
    const service = EnvService.fromSource({
      AB_TESTING_API_BASE_URL: "https://example.test/",
      AB_TESTING_ASSIGNMENTS_PATH: "api/v1/ab-testing/assignments",
    });

    expect(service.loadConfig().assignmentsEndpoint).toBe(
      "https://example.test/api/v1/ab-testing/assignments",
    );
  });

  it("supports custom prefixes such as Vite env variables", () => {
    const service = EnvService.fromSource(
      {
        VITE_AB_API_BASE_URL: "https://frontend.test",
        VITE_AB_ASSIGNMENTS_PATH: "/assignments",
        VITE_AB_ACCEPT_HEADER: "application/vnd.custom+json",
        VITE_AB_META_NAME: "custom:assignments",
        VITE_AB_UNIT_TYPE: "tenant",
        VITE_AB_UNIT_KEY: "tenant-1",
      },
      "VITE_AB_",
    );

    expect(service.loadConfig()).toEqual({
      assignmentsEndpoint: "https://frontend.test/assignments",
      featureFlagsEndpoint: "https://frontend.test/api/v1/ab-testing/feature-flags",
      acceptHeader: "application/vnd.custom+json",
      metaName: "custom:assignments",
      unit: {
        unitType: "tenant",
        unitKey: "tenant-1",
      },
    });
  });

  it("creates a client from environment-derived configuration", async () => {
    const client = createABClientFromEnv(
      {
        source: {
          AB_TESTING_API_BASE_URL: "https://api.example.test",
          AB_TESTING_ASSIGNMENTS_PATH: "/custom-assignments",
          AB_TESTING_ACCEPT_HEADER: "application/vnd.custom+json",
        },
        prefix: "AB_TESTING_",
      },
      {
        fetchImpl: async (input, init) => {
          expect(input).toBe(
            "https://api.example.test/custom-assignments?unit_type=user&unit_key=42",
          );
          expect(init).toEqual({
            headers: {
              Accept: "application/vnd.custom+json",
            },
          });

          return new Response(
            JSON.stringify({
              data: {
                type: "assignments",
                id: "user:42",
                attributes: {
                  unit_type: "user",
                  unit_key: "42",
                  assignments: { checkout: "green" },
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
      },
    );

    const hydrated = await client.hydrateFromApi({
      unitType: "user",
      unitKey: "42",
    });

    expect(hydrated).toEqual({
      unitType: "user",
      unitKey: "42",
      assignments: { checkout: "green" },
      source: "api",
    });
  });

  it("creates a feature flags admin client from environment-derived configuration", async () => {
    const client = createABClientFromEnv(
      {
        source: {
          AB_TESTING_API_BASE_URL: "https://api.example.test",
          AB_TESTING_FEATURE_FLAGS_PATH: "/ops-flags",
          AB_TESTING_ACCEPT_HEADER: "application/vnd.custom+json",
        },
        prefix: "AB_TESTING_",
      },
      {
        featureFlagsEndpoint: "https://api.example.test/ops-flags",
        fetchImpl: async (input, init) => {
          expect(input).toBe("https://api.example.test/ops-flags/dark-mode");
          expect(init).toEqual({
            method: "GET",
            headers: {
              Accept: "application/vnd.custom+json",
            },
          });

          return new Response(
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
          );
        },
      },
    );

    const flag = await client.getFeatureFlag("dark-mode");

    expect(flag.key).toBe("dark-mode");
    expect(flag.rolloutPercentage).toBe(25);
  });

  it("auto-configures createABClient from process env defaults", async () => {
    const previousBaseUrl = process.env.AB_TESTING_API_BASE_URL;
    const previousPath = process.env.AB_TESTING_ASSIGNMENTS_PATH;
    const previousAccept = process.env.AB_TESTING_ACCEPT_HEADER;

    process.env.AB_TESTING_API_BASE_URL = "https://automatic.example.test";
    process.env.AB_TESTING_ASSIGNMENTS_PATH = "/auto-assignments";
    process.env.AB_TESTING_ACCEPT_HEADER = "application/vnd.automatic+json";

    try {
      const client = createABClient({
        fetchImpl: async (input, init) => {
          expect(input).toBe(
            "https://automatic.example.test/auto-assignments?unit_type=user&unit_key=7",
          );
          expect(init).toEqual({
            headers: {
              Accept: "application/vnd.automatic+json",
            },
          });

          return new Response(
            JSON.stringify({
              data: {
                type: "assignments",
                id: "user:7",
                attributes: {
                  unit_type: "user",
                  unit_key: "7",
                  assignments: { hero: "automatic" },
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
        unitKey: "7",
      });

      expect(hydrated).toEqual({
        unitType: "user",
        unitKey: "7",
        assignments: { hero: "automatic" },
        source: "api",
      });
    } finally {
      restoreEnvVariable("AB_TESTING_API_BASE_URL", previousBaseUrl);
      restoreEnvVariable("AB_TESTING_ASSIGNMENTS_PATH", previousPath);
      restoreEnvVariable("AB_TESTING_ACCEPT_HEADER", previousAccept);
    }
  });

  it("lets explicit client options override env-derived defaults", async () => {
    const previousBaseUrl = process.env.AB_TESTING_API_BASE_URL;
    process.env.AB_TESTING_API_BASE_URL = "https://ignored.example.test";

    try {
      const client = createABClient({
        assignmentsEndpoint: "https://explicit.example.test/assignments",
        acceptHeader: "application/vnd.explicit+json",
        fetchImpl: async (input, init) => {
          expect(input).toBe(
            "https://explicit.example.test/assignments?unit_type=user&unit_key=11",
          );
          expect(init).toEqual({
            headers: {
              Accept: "application/vnd.explicit+json",
            },
          });

          return new Response(
            JSON.stringify({
              data: {
                type: "assignments",
                id: "user:11",
                attributes: {
                  unit_type: "user",
                  unit_key: "11",
                  assignments: { hero: "explicit" },
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
        unitKey: "11",
      });

      expect(hydrated.assignments).toEqual({ hero: "explicit" });
    } finally {
      restoreEnvVariable("AB_TESTING_API_BASE_URL", previousBaseUrl);
    }
  });

  it("auto-configures the feature flags admin client from process env defaults", async () => {
    const previousBaseUrl = process.env.AB_TESTING_API_BASE_URL;
    const previousPath = process.env.AB_TESTING_FEATURE_FLAGS_PATH;
    const previousAccept = process.env.AB_TESTING_ACCEPT_HEADER;

    process.env.AB_TESTING_API_BASE_URL = "https://automatic.example.test";
    process.env.AB_TESTING_FEATURE_FLAGS_PATH = "/feature-flags-admin";
    process.env.AB_TESTING_ACCEPT_HEADER = "application/vnd.automatic+json";

    try {
      const client = createABClient({
        fetchImpl: async (input, init) => {
          expect(input).toBe(
            "https://automatic.example.test/feature-flags-admin?is_enabled=1",
          );
          expect(init).toEqual({
            method: "GET",
            headers: {
              Accept: "application/vnd.automatic+json",
            },
          });

          return new Response(
            JSON.stringify({
              data: [],
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

      const collection = await client.listFeatureFlags({ isEnabled: true });

      expect(collection.items).toEqual([]);
    } finally {
      restoreEnvVariable("AB_TESTING_API_BASE_URL", previousBaseUrl);
      restoreEnvVariable("AB_TESTING_FEATURE_FLAGS_PATH", previousPath);
      restoreEnvVariable("AB_TESTING_ACCEPT_HEADER", previousAccept);
    }
  });

  it("loads dotenv variables into a target source", async () => {
    const directory = await mkdtemp(join(tmpdir(), "ab-testing-sdk-"));
    const envPath = join(directory, ".env.test");

    await writeFile(
      envPath,
      [
        "AB_TESTING_API_BASE_URL=https://dotenv.example.test",
        "AB_TESTING_UNIT_TYPE=user",
        "AB_TESTING_UNIT_KEY=99",
      ].join("\n"),
    );

    const target: Record<string, string | undefined> = {};
    const result = await configureDotenv({ path: envPath, processEnv: target });

    expect(result.loaded).toBe(true);
    expect(result.parsed).toEqual({
      AB_TESTING_API_BASE_URL: "https://dotenv.example.test",
      AB_TESTING_UNIT_TYPE: "user",
      AB_TESTING_UNIT_KEY: "99",
    });
    expect(target.AB_TESTING_API_BASE_URL).toBe("https://dotenv.example.test");

    const service = EnvService.fromSource(target);
    expect(service.loadUnitIdentity()).toEqual({ unitType: "user", unitKey: "99" });

    await rm(directory, { force: true, recursive: true });
  });
});

function restoreEnvVariable(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];

    return;
  }

  process.env[key] = value;
}
