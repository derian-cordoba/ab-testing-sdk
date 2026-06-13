# Vue Example

Small Vite + Vue example for `@derian-cordoba/ab-testing-sdk`.

## What it shows

This example uses the unified SDK client and the Vue adapter to demonstrate:

- SSR meta bootstrap with `readAssignmentsFromMeta()`
- env-driven client creation through `createABClientFromEnv(...)`
- Vue dependency injection with `installABTesting(app, { client })`
- runtime assignment reads through `useABClient()`
- backend synchronization after the first render

## SDK-driven setup

The app entrypoint uses:

```ts
import { createABClientFromEnv, EnvService, readAssignmentsFromMeta } from "@derian-cordoba/ab-testing-sdk";
import { installABTesting } from "@derian-cordoba/ab-testing-sdk/vue";
```

That means the example exercises the same unified env-resolution path that real package consumers should use.

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
VITE_AB_APP_TITLE=Vue Example
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
