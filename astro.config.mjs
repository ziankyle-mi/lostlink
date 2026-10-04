// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    // Auth is handled with our own httpOnly cookies, so no KV session store.
    sessionKVBindingName: false,
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});