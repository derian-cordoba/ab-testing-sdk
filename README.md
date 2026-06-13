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
- exposes a small client API for variant lookup
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
  endpoint: "/api/v1/ab-testing/assignments",
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

Creates the default in-memory SDK client.

```ts
import { createABClient } from "@derian-cordoba/ab-testing-sdk";

const client = createABClient();
```

### `readAssignmentsFromMeta(name?)`

Reads the SSR meta tag and returns normalized assignments.

Returns `null` when the tag is missing or when the code runs outside the browser.

### `normalizeAssignmentsDocument(document)`

Normalizes the Laravel assignments API response into the SDK's in-memory shape.

Useful if you want to bring your own fetch layer.

```ts
import { normalizeAssignmentsDocument } from "@derian-cordoba/ab-testing-sdk";

const response = await fetch("/api/v1/ab-testing/assignments?unit_type=user&unit_key=42", {
  headers: {
    Accept: "application/vnd.ab-testing.v1+json",
  },
});

const document = await response.json();
const hydrated = normalizeAssignmentsDocument(document);
```

### Client methods

The `ABClient` instance exposes:

- `getVariant(experimentKey)`: returns the variant key or `null`
- `all()`: returns the full assignment map
- `has(experimentKey)`: returns whether the experiment exists in the current state
- `isHydrated()`: returns whether the client currently holds hydrated assignments
- `unit()`: returns `{ unitType, unitKey }` or `null`
- `replace(assignments)`: replaces the current in-memory state
- `hydrateFromMeta(name?)`: reads and stores assignments from the SSR meta tag
- `hydrateFromApi(params)`: fetches and stores assignments from the server API

## React integration

```ts
import { ABProvider, useABClient } from "@derian-cordoba/ab-testing-sdk/react";
```

Example:

```tsx
import React from "react";
import {
  createABClient,
  readAssignmentsFromMeta,
} from "@derian-cordoba/ab-testing-sdk";
import { ABProvider, useABClient } from "@derian-cordoba/ab-testing-sdk/react";

const client = createABClient({
  initial: readAssignmentsFromMeta(),
});

function CheckoutButton() {
  const ab = useABClient();
  const variant = ab.getVariant("checkout-button-color");

  return variant === "green"
    ? <button className="btn-green">Buy now</button>
    : <button className="btn-default">Buy now</button>;
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
import { installABTesting, useABClient } from "@derian-cordoba/ab-testing-sdk/vue";
```

Example:

```ts
import { createApp, computed } from "vue";
import {
  createABClient,
  readAssignmentsFromMeta,
} from "@derian-cordoba/ab-testing-sdk";
import { installABTesting, useABClient } from "@derian-cordoba/ab-testing-sdk/vue";

const client = createABClient({
  initial: readAssignmentsFromMeta(),
});

const app = createApp({
  setup() {
    const ab = useABClient();
    const variant = computed(() => ab.getVariant("checkout-button-color"));

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
