// @ts-check
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

/** Starts an in-process IPv4 proxy for Supabase in dev to prevent Windows IPv6 NAT64 42-second timeout */
function supabaseProxyPlugin() {
  /** @type {import("node:http").Server | null} */
  let proxyServer = null;
  return {
    name: "supabase-ipv4-proxy",
    configureServer() {
      if (proxyServer) return;
      import("node:http").then((http) => {
        import("node:https").then((https) => {
          const TARGET = "tivjvifsygayopbgrfhp.supabase.co";
          const PORT = 54321;
          proxyServer = http.createServer((req, res) => {
            const options = {
              hostname: TARGET,
              port: 443,
              path: req.url,
              method: req.method,
              headers: { ...req.headers, host: TARGET },
            };
            const proxyReq = https.request(options, (proxyRes) => {
              res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
              proxyRes.pipe(res);
            });
            proxyReq.on("error", (err) => {
              if (!res.headersSent) {
                res.writeHead(502);
                res.end(err.message);
              }
            });
            req.pipe(proxyReq);
          });
          proxyServer.on("error", (err) => {
            // If already bound by another dev process, reuse it
            if (/** @type {any} */ (err).code !== "EADDRINUSE") {
              console.warn("[supabase-proxy] Proxy warning:", err.message);
            }
          });
          proxyServer.listen(PORT, "127.0.0.1");
        });
      });
    },
    closeBundle() {
      if (proxyServer) {
        proxyServer.close();
        proxyServer = null;
      }
    },
  };
}

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
        "img-src 'self' data: blob: https://*.supabase.co http://127.0.0.1:54321",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' http://127.0.0.1:54321 https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
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
    plugins: [tailwindcss(), supabaseProxyPlugin()],
    optimizeDeps: {
      exclude: ["devalue"],
    },
    ssr: {
      noExternal: ["devalue"],
    },
  },
});