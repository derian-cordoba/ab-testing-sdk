const DEFAULT_APP_TITLE = "React Example";
const DEFAULT_CHECKOUT_EXPERIMENT = "checkout-button-color";
const DEFAULT_PRICING_EXPERIMENT = "pricing-layout";
const DEFAULT_SYNC_ON_MOUNT = true;

export interface ExampleConfig {
  appTitle: string;
  syncOnMount: boolean;
  experiments: {
    checkoutButtonColor: string;
    pricingLayout: string;
  };
}

export const exampleConfig: ExampleConfig = {
  appTitle: readString("VITE_AB_APP_TITLE", DEFAULT_APP_TITLE),
  syncOnMount: readBoolean("VITE_AB_SYNC_ON_MOUNT", DEFAULT_SYNC_ON_MOUNT),
  experiments: {
    checkoutButtonColor: readString(
      "VITE_AB_EXPERIMENT_CHECKOUT",
      DEFAULT_CHECKOUT_EXPERIMENT,
    ),
    pricingLayout: readString(
      "VITE_AB_EXPERIMENT_PRICING",
      DEFAULT_PRICING_EXPERIMENT,
    ),
  },
};

function readString(name: keyof ImportMetaEnv, fallback: string): string {
  const value = import.meta.env[name];

  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function readBoolean(name: keyof ImportMetaEnv, fallback: boolean): boolean {
  const value = import.meta.env[name];

  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  return value.toLowerCase() === "true";
}
