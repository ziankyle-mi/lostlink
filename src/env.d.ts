/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    env: import("./lib/env").Env;
    user: import("./lib/auth").SessionUser | null;
    runtime?: {
      env?: Record<string, unknown>;
      ctx?: ExecutionContext;
    };
  }
}

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface Window {
  llToast?: (message: string, type?: "success" | "error" | "info") => void;
  reportUploadedPhotos?: unknown[];
  resetReportPhotos?: () => void;
  handleReportSubmit?: () => void | Promise<void>;
  handleClaimSubmit?: () => void | Promise<void>;
  openReport?: () => void;
  activeModalCard?: HTMLElement | null;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}