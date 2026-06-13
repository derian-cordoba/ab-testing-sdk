// @vitest-environment jsdom
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import {
  createClient,
} from "../../src/application/factories/create-ab-client.js";
import {
  ABClientKey,
  FeatureFlagsAdminClientKey,
  installABTesting,
  installFeatureFlagsAdmin,
  useABClient,
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
});
