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

interface ImportMeta {
  readonly env: ImportMetaEnv;
}