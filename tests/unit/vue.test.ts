// @vitest-environment jsdom
import { defineComponent, h } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import {
  createClient,
} from "../../src/application/factories/create-ab-client.js";
import {
  ABClientKey,
  FeatureFlagsAdminClientKey,
  installABTesting,
  installFeatureFlagsAdmin,
  useABClient,
  useAssignments,
  useFeatureFlag,
  useFeatureFlags,
  useFeatureFlagsAdminClient,
} from "../../src/presentation/vue/index.js";

describe("Vue adapter", () => {
  it("installs the client into the app container", () => {
    const provided: Array<{ key: symbol; value: unknown }> = [];
    const app = {
      provide(key: typeof ABClientKey, value: unknown) {
        provided.push({ key: key as unknown as symbol, value });
      },
    };
    const client = createClient();

    installABTesting(app as never, { client });

    expect(provided[0]).toEqual({
      key: ABClientKey as unknown as symbol,
      value: client,
    });
  });

  it("resolves the client from Vue injection context", () => {
    const client = createClient();

    const Consumer = defineComponent({
      setup() {
        const resolved = useABClient();

        return () => h("div", resolved === client ? "ok" : "fail");
      },
    });

    const wrapper = mount(Consumer, {
      global: {
        provide: {
          [ABClientKey as unknown as symbol]: client,
        },
      },
    });

    expect(wrapper.text()).toBe("ok");
  });

  it("installs the feature flags admin client into the app container", () => {
    const provided: Array<{ key: symbol; value: unknown }> = [];
    const app = {
      provide(key: typeof FeatureFlagsAdminClientKey, value: unknown) {
        provided.push({ key: key as unknown as symbol, value });
      },
    };
    const client = createClient();

    installFeatureFlagsAdmin(app as never, { client });

    expect(provided[0]).toEqual({
      key: FeatureFlagsAdminClientKey as unknown as symbol,
      value: client,
    });
  });

  it("resolves the feature flags admin client from Vue injection context", () => {
    const client = createClient();

    const Consumer = defineComponent({
      setup() {
        const resolved = useFeatureFlagsAdminClient();

        return () => h("div", resolved === client ? "ok" : "fail");
      },
    });

    const wrapper = mount(Consumer, {
      global: {
        provide: {
          [FeatureFlagsAdminClientKey as unknown as symbol]: client,
        },
      },
    });

    expect(wrapper.text()).toBe("ok");
  });

  it("hydrates assignments through a cache-aware composable", async () => {
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

    const Consumer = defineComponent({
      setup() {
        const state = useAssignments({
          apiParams: { unitType: "user", unitKey: "99" },
          hydrateFromApiOnMount: true,
        });

        return () => h("div", state.assignments.value.hero ?? "missing");
      },
    });

    const first = mount(Consumer, {
      global: {
        provide: {
          [ABClientKey as unknown as symbol]: client,
        },
      },
    });

    await flushPromises();
    expect(first.text()).toBe("variant");

    first.unmount();

    const second = mount(Consumer, {
      global: {
        provide: {
          [ABClientKey as unknown as symbol]: client,
        },
      },
    });

    await flushPromises();
    expect(second.text()).toBe("variant");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("loads one feature flag through a cache-aware composable", async () => {
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

    const Consumer = defineComponent({
      setup() {
        const state = useFeatureFlag("dark-mode");

        return () => h("div", state.flag.value?.key ?? "missing");
      },
    });

    const first = mount(Consumer, {
      global: {
        provide: {
          [ABClientKey as unknown as symbol]: client,
        },
      },
    });

    await flushPromises();
    expect(first.text()).toBe("dark-mode");

    first.unmount();

    const second = mount(Consumer, {
      global: {
        provide: {
          [ABClientKey as unknown as symbol]: client,
        },
      },
    });

    await flushPromises();
    expect(second.text()).toBe("dark-mode");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("loads the feature flag collection through a cache-aware composable", async () => {
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

    const Consumer = defineComponent({
      setup() {
        const state = useFeatureFlags({ params: { isEnabled: true } });

        return () =>
          h("div", String(state.collection.value?.items.length ?? 0));
      },
    });

    const first = mount(Consumer, {
      global: {
        provide: {
          [ABClientKey as unknown as symbol]: client,
        },
      },
    });

    await flushPromises();
    expect(first.text()).toBe("1");

    first.unmount();

    const second = mount(Consumer, {
      global: {
        provide: {
          [ABClientKey as unknown as symbol]: client,
        },
      },
    });

    await flushPromises();
    expect(second.text()).toBe("1");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
