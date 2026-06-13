<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  EnvService,
  type AssignmentMap,
  type UnitIdentity,
} from "@derian-cordoba/ab-testing-sdk";
import { useABClient } from "@derian-cordoba/ab-testing-sdk/vue";
import { exampleConfig } from "./example-config";

type SyncStatus =
  | "meta-default"
  | "syncing"
  | "synced"
  | "failed"
  | "missing-unit"
  | "sync-disabled";

const ab = useABClient();
const sdkConfig = EnvService.fromSource(import.meta.env, "VITE_AB_").loadConfig();

const assignments = ref<AssignmentMap>(ab.all());
const unit = ref<UnitIdentity | null>(ab.unit() ?? resolveFetchUnit(null));
const status = ref<SyncStatus>(
  exampleConfig.syncOnMount
    ? resolveFetchUnit(ab.unit()) === null
      ? "missing-unit"
      : "meta-default"
    : "sync-disabled",
);

const checkoutVariant = computed(
  () => assignments.value[exampleConfig.experiments.checkoutButtonColor] ?? null,
);
const pricingVariant = computed(
  () => assignments.value[exampleConfig.experiments.pricingLayout] ?? null,
);

onMounted(async () => {
  if (!exampleConfig.syncOnMount) {
    status.value = "sync-disabled";
    return;
  }

  const currentUnit = resolveFetchUnit(ab.unit());

  if (currentUnit === null) {
    status.value = "missing-unit";
    return;
  }

  unit.value = currentUnit;
  status.value = "syncing";

  try {
    await ab.hydrateFromApi(currentUnit);
    assignments.value = ab.all();
    unit.value = ab.unit() ?? currentUnit;
    status.value = "synced";
  } catch {
    status.value = "failed";
  }
});

function resolveFetchUnit(currentUnit: UnitIdentity | null): UnitIdentity | null {
  if (currentUnit !== null) {
    return currentUnit;
  }

  return EnvService.fromSource(import.meta.env, "VITE_AB_").loadUnitIdentity();
}

function statusLabel(currentStatus: SyncStatus): string {
  switch (currentStatus) {
    case "meta-default":
      return "Using meta-tag fallback while the client prepares the API sync.";
    case "syncing":
      return "Fetching the current assignments from the backend.";
    case "synced":
      return "Backend assignments fetched successfully and applied to the client.";
    case "failed":
      return "Backend request failed. The UI stayed on the existing fallback assignments.";
    case "missing-unit":
      return "No unit identity is available, so the backend request was skipped.";
    case "sync-disabled":
      return "Backend synchronization is disabled through the example environment configuration.";
  }
}
</script>

<template>
  <main class="page-shell">
    <p class="eyebrow">{{ exampleConfig.appTitle }}</p>
    <h1 class="hero-title">Meta fallback first, backend sync second</h1>
    <p class="hero-copy">
      This example starts with the SSR meta tag as an immediate default value,
      then requests the real assignments endpoint and replaces the client state
      when the backend responds.
    </p>

    <section class="status-panel">
      <div><strong>Status:</strong> {{ statusLabel(status) }}</div>
      <div><strong>Endpoint:</strong> <code>{{ sdkConfig.assignmentsEndpoint }}</code></div>
      <div><strong>Accept:</strong> <code>{{ sdkConfig.acceptHeader }}</code></div>
    </section>

    <section class="card-grid">
      <article class="variant-card accent-amber">
        <h2>Unit</h2>
        <p>{{ unit === null ? "No hydrated unit found." : `${unit.unitType}:${unit.unitKey}` }}</p>
      </article>

      <article class="variant-card" :class="checkoutVariant === 'green' ? 'accent-green' : 'accent-slate'">
        <h2>Checkout Variant</h2>
        <p>{{ checkoutVariant ?? "No assignment" }}</p>
      </article>

      <article class="variant-card" :class="pricingVariant === 'control' ? 'accent-blue' : 'accent-berry'">
        <h2>Pricing Variant</h2>
        <p>{{ pricingVariant ?? "No assignment" }}</p>
      </article>
    </section>

    <section class="cta-row">
      <button
        type="button"
        class="cta-button"
        :class="checkoutVariant === 'green' ? 'cta-green' : 'cta-default'"
      >
        {{ checkoutVariant === "green" ? "Buy now" : "Continue" }}
      </button>

      <code class="assignment-dump">{{ JSON.stringify(assignments) }}</code>
    </section>
  </main>
</template>

<style scoped>
:global(body) {
  margin: 0;
  font-family: "Iowan Old Style", "Palatino Linotype", serif;
  background:
    radial-gradient(circle at top left, rgba(255, 219, 172, 0.6), transparent 35%),
    linear-gradient(180deg, #f8f2e8 0%, #efe4d1 100%);
  color: #1d232b;
}

:global(*) {
  box-sizing: border-box;
}

.page-shell {
  max-width: 900px;
  margin: 0 auto;
  padding: 48px 24px 72px;
}

.eyebrow {
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #8a5f2c;
  font-weight: 700;
}

.hero-title {
  font-size: clamp(2.4rem, 5vw, 4.6rem);
  line-height: 1;
  margin-bottom: 12px;
}

.hero-copy {
  font-size: 1.1rem;
  line-height: 1.7;
  max-width: 680px;
}

.status-panel {
  margin-top: 24px;
  margin-bottom: 24px;
  padding: 14px 18px;
  border-radius: 14px;
  background: rgba(27, 31, 35, 0.08);
  border: 1px solid rgba(27, 31, 35, 0.08);
  display: grid;
  gap: 8px;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  margin-top: 32px;
  margin-bottom: 32px;
}

.variant-card {
  border: 2px solid #5b6670;
  border-radius: 18px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
}

.variant-card h2 {
  margin-top: 0;
}

.variant-card p {
  margin-bottom: 0;
  line-height: 1.6;
}

.accent-amber {
  border-color: #c17b36;
}

.accent-green {
  border-color: #1f8f54;
}

.accent-slate {
  border-color: #5b6670;
}

.accent-blue {
  border-color: #345caa;
}

.accent-berry {
  border-color: #8f2d56;
}

.cta-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.cta-button {
  border: 0;
  border-radius: 999px;
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 700;
  color: white;
  cursor: pointer;
}

.cta-default {
  background: #20262d;
}

.cta-green {
  background: #1f8f54;
}

.assignment-dump {
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(27, 31, 35, 0.08);
}
</style>
