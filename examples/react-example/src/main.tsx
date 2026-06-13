import React from "react";
import ReactDOM from "react-dom/client";
import {
  createABClientFromEnv,
  EnvService,
  readAssignmentsFromMeta,
} from "@derian-cordoba/ab-testing-sdk";
import { ABProvider } from "@derian-cordoba/ab-testing-sdk/react";
import { App } from "./App";

const sdkEnvService = EnvService.fromSource(import.meta.env, "VITE_AB_");
const sdkConfig = sdkEnvService.loadConfig();

const client = createABClientFromEnv(
  {
    source: import.meta.env,
    prefix: "VITE_AB_",
  },
  {
    initial: readAssignmentsFromMeta(sdkConfig.metaName),
  }
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ABProvider client={client}>
      <App />
    </ABProvider>
  </React.StrictMode>
);
