# AB Testing SDK

`@derian-cordoba/ab-testing-sdk` is a small JavaScript/TypeScript SDK for consuming server-authoritative A/B test assignments.

This package is designed to work with the Laravel package in this ecosystem. The Laravel side resolves and persists sticky assignments, exposes them through SSR meta tags and the assignments API, and this SDK reads those assignments in the browser without re-bucketing.

## Relationship to the Laravel package

This SDK is not a standalone experimentation engine.

The expected architecture is:

- `laravel-ab-testing`: source of truth for experiment resolution, sticky assignment persistence, exposure/metrics, and the assignments API contract
- `@derian-cordoba/ab-testing-sdk`: browser-side consumer of those server assignments for hydration, UI branching, and framework integration

In practice, the Laravel package should provide at least one of these integration points:

- an SSR meta tag like:

```html
<meta
  name="ab-testing:assignments"
  content='{"unit_type":"user","unit_key":"42","assignments":{"checkout-button-color":"green"}}'
/>
```

- a versioned assignments endpoint like:

```http
GET /api/v1/ab-testing/assignments?unit_type=user&unit_key=42
Accept: application/vnd.ab-testing.v1+json
```

If you are using the Laravel package from this same ecosystem, this SDK should be treated as the browser/client companion to that package.

## What this SDK does

- reads the assignment the server already resolved
- normalizes DOM and HTTP payloads into one in-memory shape
- avoids client-side re-bucketing by default
- exposes one shared client for runtime hydration and feature flag management
- provides optional React and Vue integration helpers

## What this SDK does not do

- it does not define experiments
- it does not hash or bucket users in the browser by default
- it does not replace the Laravel package's resolver or persistence model
- it does not track metrics or exposures on its own yet

## Structure

The package uses a small layered architecture:

- `src/domain`: contracts, guards, and shared errors
- `src/application`: client factory and orchestration service
- `src/infrastructure`: DOM and HTTP transport adapters
- `src/presentation`: framework adapters for React and Vue

This keeps transport-specific logic away from the public contract and makes it easier to grow the SDK without turning `src/` into a flat utility folder.

## Install

```bash
npm install @derian-cordoba/ab-testing-sdk
```

## Environment configuration

The SDK can configure itself automatically from environment variables.

The root package includes a [`.env.example`](/Users/deriancordoba/Developer/personal/ab-testing/.env.example) file with the supported variables:

```dotenv
AB_TESTING_API_BASE_URL=
AB_TESTING_ASSIGNMENTS_PATH=/api/v1/ab-testing/assignments
AB_TESTING_FEATURE_FLAGS_PATH=/api/v1/ab-testing/feature-flags
AB_TESTING_ACCEPT_HEADER=application/vnd.ab-testing.v1+json
AB_TESTING_META_NAME=ab-testing:assignments
AB_TESTING_UNIT_TYPE=user
AB_TESTING_UNIT_KEY=42
```

These variables are used by the SDK `EnvService` and the default client factory.

### Supported variables

- `AB_TESTING_API_BASE_URL`: optional backend origin such as `http://localhost:8765`
- `AB_TESTING_ASSIGNMENTS_PATH`: assignments endpoint path or full URL
- `AB_TESTING_FEATURE_FLAGS_PATH`: feature flags admin endpoint path or full URL
- `AB_TESTING_ACCEPT_HEADER`: media type sent to the assignments API
- `AB_TESTING_META_NAME`: SSR meta tag name used by `hydrateFromMeta()`
- `AB_TESTING_UNIT_TYPE`: optional fallback unit type for application code
- `AB_TESTING_UNIT_KEY`: optional fallback unit key for application code

### Configuration precedence

The SDK resolves configuration in this order:

1. built-in SDK defaults
2. environment-derived values from `EnvService`
3. explicit options passed by the consumer

That means you can rely on env defaults for shared setup and still override any field directly when creating the client.

## Core concepts

### Hydrated assignments

Every transport is normalized into the same client-side shape:

```ts
interface HydratedAssignments {
  unitType: string;
  unitKey: string;
  assignments: Record<string, string>;
  source: "meta" | "api";
}
```

### Server-authoritative behavior

The SDK is built around one rule: if the server already resolved the assignment, the browser should reuse it.

That prevents:

- flicker during hydration
- SSR/CSR mismatch between server HTML and browser state
- assignment drift caused by client-side hashing differences

## Usage

### 1. SSR meta bootstrap

Use this when the Laravel application injects a meta tag into the rendered HTML.

```html
<meta
  name="ab-testing:assignments"
  content='{"unit_type":"user","unit_key":"42","assignments":{"checkout-button-color":"green"}}'
/>
```

```ts
import {
  createABClient,
  readAssignmentsFromMeta,
} from "@derian-cordoba/ab-testing-sdk";

const client = createABClient({
  initial: readAssignmentsFromMeta(),
});

const variant = client.getVariant("checkout-button-color");
```

This is the preferred path for SSR pages because it avoids an extra request and guarantees the browser reads the same assignment used by the server render.

### 2. API bootstrap

Use this when the page cannot hydrate from HTML or when the client needs to fetch assignments explicitly.

```ts
import { createABClient } from "@derian-cordoba/ab-testing-sdk";

const client = createABClient({
  assignmentsEndpoint: "/api/v1/ab-testing/assignments",
  acceptHeader: "application/vnd.ab-testing.v1+json",
});

await client.hydrateFromApi({
  unitType: "user",
  unitKey: "42",
});
```

The default expected media type is:

```http
Accept: application/vnd.ab-testing.v1+json
```

## Client API

### `createABClient(options)`

Creates the unified SDK client.

This factory now reads env-derived defaults automatically through `EnvService`, then applies any explicit `options` you pass.

```ts
import { createABClient } from "@derian-cordoba/ab-testing-sdk";

const client = createABClient();
```

Example with an explicit override:

```ts
const client = createABClient({
  assignmentsEndpoint: "https://api.example.test/api/v1/ab-testing/assignments",
  featureFlagsEndpoint:
    "https://api.example.test/api/v1/ab-testing/feature-flags",
});
```

The same instance exposes:

- runtime assignment methods such as `hydrateFromMeta()`, `hydrateFromApi()`, and `getVariant()`
- feature flags admin methods such as `listFeatureFlags()`, `enableFeatureFlag()`, and `setFeatureFlagRollout()`
- cache control through `clearCache()` when the optional in-memory cache is enabled

Optional in-memory cache example:

```ts
const client = createABClient({
  cache: {
    ttlMs: 60_000,
    assignments: { enabled: true },
    featureFlags: { enabled: true },
  },
});
```

Cache behavior:

- disabled by default
- enabled only when `cache: true` or `cache: { ... }` is passed
- assignment cache keys are scoped by `unitType` and `unitKey`
- feature flag read caches are invalidated automatically after feature flag write operations

### `createABClientFromEnv(envOptions?, clientOptions?)`

Creates the unified client from a custom env source or prefix.

This is useful when your runtime does not use `process.env` directly, such as Vite with `import.meta.env`.

```ts
import { createABClientFromEnv } from "@derian-cordoba/ab-testing-sdk";

const client = createABClientFromEnv(
  {
    source: import.meta.env,
    prefix: "VITE_AB_",
  },
  {
    initial: null,
  }
);
```

### `EnvService`

Reads SDK configuration from one env source and normalizes it into a stable runtime config.

```ts
import { EnvService } from "@derian-cordoba/ab-testing-sdk";

const env = EnvService.fromProcessEnv();
const config = env.loadConfig();
const unit = env.loadUnitIdentity();
```

Use `fromSource()` when your host framework exposes env variables through a custom object:

```ts
const env = EnvService.fromSource(import.meta.env, "VITE_AB_");
```

The resolved config now includes both:

- `assignmentsEndpoint`: assignments endpoint used by the unified client
- `featureFlagsEndpoint`: feature flags admin endpoint used by the management client

### `configureDotenv(options?)`

Loads env variables from a dotenv file for Node.js or SSR entrypoints.

This helper should not be used in browser-only bundles. It is intended for server runtimes before you create the client.

```ts
import {
  configureDotenv,
  createABClientFromEnv,
} from "@derian-cordoba/ab-testing-sdk";

await configureDotenv();

const client = createABClientFromEnv();
```

### Compatibility factories

The SDK exports:

- `createABClient(...)`
- `createABClientFromEnv(...)`

These are the preferred entrypoints going forward.

## Feature flags admin API

The SDK now includes a dedicated management client for the server-side feature
flags API under `/api/v1/ab-testing/feature-flags`.

This client is intended for:

- admin dashboards
- internal tooling
- CI/CD operational controls
- rollout and kill-switch automation

It is not the runtime flag-evaluation client for end-user rendering. Runtime
flag hydration should still come from a server-authoritative evaluated payload.

### Admin client methods

The unified `ABTestingClient` instance exposes:

- `listFeatureFlags(params?)`
- `getFeatureFlag(key)`
- `createFeatureFlag(params)`
- `deleteFeatureFlag(key)`
- `enableFeatureFlag(key)`
- `disableFeatureFlag(key)`
- `setFeatureFlagRollout(key, params)`
- `activateFeatureFlagKillSwitch(key)`
- `deactivateFeatureFlagKillSwitch(key)`
- `setFeatureFlagConditions(key, params)`
- `clearFeatureFlagConditions(key)`

### Example

```ts
import { createABClient } from "@derian-cordoba/ab-testing-sdk";

const client = createABClient({
  featureFlagsEndpoint: "http://localhost:8765/api/v1/ab-testing/feature-flags",
});

await client.enableFeatureFlag("dark-mode");

await client.setFeatureFlagRollout("dark-mode", {
  rolloutPercentage: 25,
});

await client.setFeatureFlagConditions("dark-mode", {
  conditions: [{ attribute: "plan", operator: "equals", expected: "pro" }],
  conditionsLogic: "all",
});
```

### React integration

The React adapter uses the unified `ABTestingClient` through one shared
provider and exposes cache-aware hooks for assignments and feature flag reads.

```ts
import {
  ABProvider,
  useABClient,
  useAssignments,
  useFeatureFlag,
  useFeatureFlags,
  useFeatureFlagsAdminClient,
} from "@derian-cordoba/ab-testing-sdk/react";
```

Example:

```tsx
import React from "react";
import { createABClient } from "@derian-cordoba/ab-testing-sdk";
import {
  ABProvider,
  useAssignments,
  useFeatureFlags,
} from "@derian-cordoba/ab-testing-sdk/react";

const client = createABClient({
  assignmentsEndpoint: "http://localhost:8765/api/v1/ab-testing/assignments",
  featureFlagsEndpoint: "http://localhost:8765/api/v1/ab-testing/feature-flags",
  cache: {
    assignments: { enabled: true, ttlMs: 60_000 },
    featureFlags: { enabled: true, ttlMs: 60_000 },
  },
});

function Dashboard() {
  const assignments = useAssignments({
    apiParams: { unitType: "user", unitKey: "42" },
    hydrateFromApiOnMount: true,
  });
  const flags = useFeatureFlags({ loadOnMount: true });

  if (assignments.isLoading || flags.isLoading) {
    return <div>Loading</div>;
  }

  return (
    <div>
      <pre>{JSON.stringify(assignments.assignments, null, 2)}</pre>
      <pre>{JSON.stringify(flags.collection?.items ?? [], null, 2)}</pre>
    </div>
  );
}

export function App() {
  return (
    <ABProvider client={client}>
      <Dashboard />
    </ABProvider>
  );
}
```

Available React helpers:

- `ABProvider`
- `FeatureFlagsAdminProvider`
- `useABClient()`
- `useAssignments()`
- `useFeatureFlag()`
- `useFeatureFlags()`
- `useFeatureFlagsAdminClient()`

### Vue integration

The Vue adapter also uses the unified `ABTestingClient` and exposes cache-aware
composables for assignments and feature flag reads.

```ts
import {
  installABTesting,
  useABClient,
  useAssignments,
  useFeatureFlag,
  useFeatureFlags,
  useFeatureFlagsAdminClient,
} from "@derian-cordoba/ab-testing-sdk/vue";
```

Example:

```ts
import { createApp, defineComponent, h } from "vue";
import { createABClient } from "@derian-cordoba/ab-testing-sdk";
import {
  installABTesting,
  useAssignments,
  useFeatureFlags,
} from "@derian-cordoba/ab-testing-sdk/vue";

const client = createABClient({
  assignmentsEndpoint: "http://localhost:8765/api/v1/ab-testing/assignments",
  featureFlagsEndpoint: "http://localhost:8765/api/v1/ab-testing/feature-flags",
  cache: {
    assignments: { enabled: true, ttlMs: 60_000 },
    featureFlags: { enabled: true, ttlMs: 60_000 },
  },
});

const Root = defineComponent({
  setup() {
    const assignments = useAssignments({
      apiParams: { unitType: "user", unitKey: "42" },
      hydrateFromApiOnMount: true,
    });
    const flags = useFeatureFlags({ loadOnMount: true });

    return () =>
      h(
        "pre",
        JSON.stringify(
          {
            assignments: assignments.assignments.value,
            flags: flags.collection.value?.items ?? [],
          },
          null,
          2
        )
      );
  },
});

const app = createApp(Root);
installABTesting(app, { client });
app.mount("#app");
```

Available Vue helpers:

- `installABTesting(app, { client })`
- `installFeatureFlagsAdmin(app, { client })`
- `useABClient()`
- `useAssignments()`
- `useFeatureFlag()`
- `useFeatureFlags()`
- `useFeatureFlagsAdminClient()`

### `readAssignmentsFromMeta(name?)`

Reads the SSR meta tag and returns normalized assignments.

Returns `null` when the tag is missing or when the code runs outside the browser.

### `normalizeAssignmentsDocument(document)`

Normalizes the Laravel assignments API response into the SDK's in-memory shape.

Useful if you want to bring your own fetch layer.

```ts
import { normalizeAssignmentsDocument } from "@derian-cordoba/ab-testing-sdk";

const response = await fetch(
  "/api/v1/ab-testing/assignments?unit_type=user&unit_key=42",
  {
    headers: {
      Accept: "application/vnd.ab-testing.v1+json",
    },
  }
);

const document = await response.json();
const hydrated = normalizeAssignmentsDocument(document);
```

### Client methods

The unified `ABTestingClient` instance exposes:

- `getVariant(experimentKey)`: returns the variant key or `null`
- `all()`: returns the full assignment map
- `has(experimentKey)`: returns whether the experiment exists in the current state
- `isHydrated()`: returns whether the client currently holds hydrated assignments
- `unit()`: returns `{ unitType, unitKey }` or `null`
- `replace(assignments)`: replaces the current in-memory state
- `hydrateFromMeta(name?)`: reads and stores assignments from the SSR meta tag
- `hydrateFromApi(params)`: fetches and stores assignments from the server API
- `clearCache()`: clears all SDK-managed in-memory cache entries

## React integration

```ts
import {
  ABProvider,
  useABClient,
  useAssignments,
} from "@derian-cordoba/ab-testing-sdk/react";
```

Example:

```tsx
import React from "react";
import {
  createABClient,
  readAssignmentsFromMeta,
} from "@derian-cordoba/ab-testing-sdk";
import {
  ABProvider,
  useABClient,
  useAssignments,
} from "@derian-cordoba/ab-testing-sdk/react";

const client = createABClient({
  initial: readAssignmentsFromMeta(),
  cache: {
    assignments: { enabled: true, ttlMs: 60_000 },
  },
});

function CheckoutButton() {
  const ab = useABClient();
  const assignments = useAssignments();
  const variant =
    assignments.assignments["checkout-button-color"] ??
    ab.getVariant("checkout-button-color");

  return variant === "green" ? (
    <button className="btn-green">Buy now</button>
  ) : (
    <button className="btn-default">Buy now</button>
  );
}

export function App() {
  return (
    <ABProvider client={client}>
      <CheckoutButton />
    </ABProvider>
  );
}
```

## Vue integration

```ts
import {
  installABTesting,
  useABClient,
  useAssignments,
} from "@derian-cordoba/ab-testing-sdk/vue";
```

Example:

```ts
import { createApp, computed } from "vue";
import {
  createABClient,
  readAssignmentsFromMeta,
} from "@derian-cordoba/ab-testing-sdk";
import {
  installABTesting,
  useABClient,
  useAssignments,
} from "@derian-cordoba/ab-testing-sdk/vue";

const client = createABClient({
  initial: readAssignmentsFromMeta(),
  cache: {
    assignments: { enabled: true, ttlMs: 60_000 },
  },
});

const app = createApp({
  setup() {
    const ab = useABClient();
    const { assignments } = useAssignments();
    const variant = computed(
      () =>
        assignments.value["checkout-button-color"] ??
        ab.getVariant("checkout-button-color")
    );

    return { variant };
  },
});

installABTesting(app, { client });
app.mount("#app");
```

## Error handling

The SDK exposes three error classes:

- `ABTestingError`: base SDK error
- `ABTestingParseError`: invalid meta payload or invalid JSON:API document
- `ABTestingFetchError`: non-success HTTP response from the assignments endpoint

Example:

```ts
import { ABTestingFetchError } from "@derian-cordoba/ab-testing-sdk";

try {
  await client.hydrateFromApi({ unitType: "user", unitKey: "42" });
} catch (error) {
  if (error instanceof ABTestingFetchError) {
    console.error(error.status);
  }
}
```

## Development

Useful scripts:

```bash
npm run test:types
npm test
npm run test:watch
npm run build
```

## Reference implementation

The primary server-side reference for this SDK is the Laravel package in this ecosystem:

- `laravel-ab-testing`

That package is responsible for:

- versioned assignments endpoints
- the `application/vnd.ab-testing.v1+json` media type
- SSR assignment meta emission
- sticky assignment persistence
- experiment resolution on the server

This SDK should follow that contract rather than inventing a second source of truth in the browser.
