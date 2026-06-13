import { createApp } from "vue";
import {
  createABClientFromEnv,
  EnvService,
  readAssignmentsFromMeta,
} from "@derian-cordoba/ab-testing-sdk";
import { installABTesting } from "@derian-cordoba/ab-testing-sdk/vue";
import App from "./App.vue";

const sdkEnvService = EnvService.fromSource(import.meta.env, "VITE_AB_");
const sdkConfig = sdkEnvService.loadConfig();

const client = createABClientFromEnv(
  {
    source: import.meta.env,
    prefix: "VITE_AB_",
  },
  {
    initial: readAssignmentsFromMeta(sdkConfig.metaName),
  },
);

const app = createApp(App);
installABTesting(app, { client });
app.mount("#app");
