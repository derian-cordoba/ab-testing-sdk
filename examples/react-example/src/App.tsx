import { useEffect, useState } from "react";
import {
  EnvService,
  type AssignmentMap,
  type UnitIdentity,
} from "@derian-cordoba/ab-testing-sdk";
import { useABClient } from "@derian-cordoba/ab-testing-sdk/react";
import { exampleConfig } from "./example-config";

type SyncStatus =
  | "meta-default"
  | "syncing"
  | "synced"
  | "failed"
  | "missing-unit"
  | "sync-disabled";

function VariantCard({
  title,
  description,
  accent,
}: {
  title: string;
  description: string;
  accent: string;
}) {
  return (
    <section
      style={{
        border: `2px solid ${accent}`,
        borderRadius: 18,
        padding: 20,
        background: "rgba(255,255,255,0.84)",
        boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
      }}
    >
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p style={{ marginBottom: 0, lineHeight: 1.6 }}>{description}</p>
    </section>
  );
}

function statusLabel(status: SyncStatus): string {
  switch (status) {
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

function resolveFetchUnit(unit: UnitIdentity | null): UnitIdentity | null {
  if (unit !== null) {
    return unit;
  }

  return EnvService.fromSource(import.meta.env, "VITE_AB_").loadUnitIdentity();
}

export function App() {
  const ab = useABClient();
  const sdkConfig = EnvService.fromSource(
    import.meta.env,
    "VITE_AB_"
  ).loadConfig();
  const [assignments, setAssignments] = useState<AssignmentMap>(() => ab.all());
  const [unit, setUnit] = useState<UnitIdentity | null>(
    () => ab.unit() ?? resolveFetchUnit(null)
  );
  const [status, setStatus] = useState<SyncStatus>(
    exampleConfig.syncOnMount
      ? resolveFetchUnit(ab.unit()) === null
        ? "missing-unit"
        : "meta-default"
      : "sync-disabled"
  );

  useEffect(() => {
    if (!exampleConfig.syncOnMount) {
      setStatus("sync-disabled");
      return;
    }

    const currentUnit = resolveFetchUnit(ab.unit());

    if (currentUnit === null) {
      setStatus("missing-unit");
      return;
    }

    let active = true;

    setUnit(currentUnit);
    setStatus("syncing");

    ab.hydrateFromApi(currentUnit)
      .then(() => {
        if (!active) {
          return;
        }

        setAssignments(ab.all());
        setUnit(ab.unit() ?? currentUnit);
        setStatus("synced");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setStatus("failed");
      });

    return () => {
      active = false;
    };
  }, [ab]);

  const checkoutVariant =
    assignments[exampleConfig.experiments.checkoutButtonColor] ?? null;
  const pricingVariant =
    assignments[exampleConfig.experiments.pricingLayout] ?? null;

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "48px 24px 72px",
      }}
    >
      <p
        style={{
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "#8a5f2c",
          fontWeight: 700,
        }}
      >
        {exampleConfig.appTitle}
      </p>
      <h1
        style={{
          fontSize: "clamp(2.4rem, 5vw, 4.6rem)",
          lineHeight: 1,
          marginBottom: 12,
        }}
      >
        Meta fallback first, backend sync second
      </h1>
      <p style={{ fontSize: "1.1rem", lineHeight: 1.7, maxWidth: 680 }}>
        This example starts with the SSR meta tag as an immediate default value,
        then requests the real assignments endpoint and replaces the client
        state when the backend responds.
      </p>

      <div
        style={{
          marginTop: 24,
          marginBottom: 24,
          padding: "14px 18px",
          borderRadius: 14,
          background: "rgba(27,31,35,0.08)",
          border: "1px solid rgba(27,31,35,0.08)",
          display: "grid",
          gap: 8,
        }}
      >
        <div>
          <strong>Status:</strong> {statusLabel(status)}
        </div>
        <div>
          <strong>Endpoint:</strong> <code>{sdkConfig.endpoint}</code>
        </div>
        <div>
          <strong>Accept:</strong> <code>{sdkConfig.acceptHeader}</code>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 20,
          marginTop: 32,
          marginBottom: 32,
        }}
      >
        <VariantCard
          title="Unit"
          description={
            unit === null
              ? "No hydrated unit found."
              : `${unit.unitType}:${unit.unitKey}`
          }
          accent="#c17b36"
        />
        <VariantCard
          title="Checkout Variant"
          description={checkoutVariant ?? "No assignment"}
          accent={checkoutVariant === "green" ? "#1f8f54" : "#5b6670"}
        />
        <VariantCard
          title="Pricing Variant"
          description={pricingVariant ?? "No assignment"}
          accent={pricingVariant === "control" ? "#345caa" : "#8f2d56"}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          style={{
            border: 0,
            borderRadius: 999,
            padding: "14px 24px",
            fontSize: 16,
            fontWeight: 700,
            color: "white",
            background: checkoutVariant === "green" ? "#1f8f54" : "#20262d",
            cursor: "pointer",
          }}
        >
          {checkoutVariant === "green" ? "Buy now" : "Continue"}
        </button>
        <code
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(27,31,35,0.08)",
          }}
        >
          {JSON.stringify(assignments)}
        </code>
      </div>
    </main>
  );
}
