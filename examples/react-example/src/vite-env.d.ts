/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AB_API_BASE_URL?: string;
  readonly VITE_AB_ASSIGNMENTS_PATH?: string;
  readonly VITE_AB_ACCEPT_HEADER?: string;
  readonly VITE_AB_META_NAME?: string;
  readonly VITE_AB_SYNC_ON_MOUNT?: string;
  readonly VITE_AB_UNIT_TYPE?: string;
  readonly VITE_AB_UNIT_KEY?: string;
  readonly VITE_AB_EXPERIMENT_CHECKOUT?: string;
  readonly VITE_AB_EXPERIMENT_PRICING?: string;
  readonly VITE_AB_APP_TITLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
