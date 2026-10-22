// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  integrations: [react()],
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "form-action 'self'",
        "img-src 'self' data: blob: https://*.supabase.co",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
        "frame-src https://challenges.cloudflare.com",
        "media-src 'self' blob:",
        "worker-src 'self' blob:",
        "manifest-src 'self'",
        "upgrade-insecure-requests",
      ],
      styleDirective: {
        resources: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      },
      scriptDirective: {
        resources: ["'self'", "https://challenges.cloudflare.com"],
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["devalue"],
    },
    ssr: {
      noExternal: ["devalue"],
    },
  },
});