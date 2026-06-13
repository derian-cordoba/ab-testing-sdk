# React Example

Small Vite + React example for `@derian-cordoba/ab-testing-sdk`.

## What changed

This example now uses the SDK's own env/config support instead of an example-local env service.

The SDK now handles:

- backend base URL
- assignments endpoint path
- API media type
- meta tag name
- fallback unit identity

The example only keeps a tiny local config layer for demo-only concerns:

- app title
- experiment keys used by the UI
- whether backend sync runs automatically

## SDK-driven setup

The app entrypoint now uses:

```ts
import {
  createABClientFromEnv,
  EnvService,
  readAssignmentsFromMeta,
} from "@derian-cordoba/ab-testing-sdk";

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
```

That means the example is now exercising the same env-resolution path that consumers of the root library should use.

## Environment loading

Vite already loads `.env` files automatically, so this example no longer needs its own `dotenv` setup in `vite.config.ts`.

## Environment variables

Create a local `.env` file from `.env.example`.

```bash
cp .env.example .env
```

Available variables:

```dotenv
VITE_AB_API_BASE_URL=
VITE_AB_ASSIGNMENTS_PATH=/api/v1/ab-testing/assignments
VITE_AB_ACCEPT_HEADER=application/vnd.ab-testing.v1+json
VITE_AB_META_NAME=ab-testing:assignments
VITE_AB_SYNC_ON_MOUNT=true
VITE_AB_UNIT_TYPE=user
VITE_AB_UNIT_KEY=42
VITE_AB_EXPERIMENT_CHECKOUT=checkout-button-color
VITE_AB_EXPERIMENT_PRICING=pricing-layout
VITE_AB_APP_TITLE=React Example
```

## Flow

The example uses this order:

1. read the SSR meta tag immediately
2. use that payload as the default UI state
3. resolve the fetch unit from meta or from the SDK env fallback unit
4. call the backend assignments endpoint
5. replace the client state after the server responds

## Run locally

```bash
npm install
npm run dev
```
