// Cloudflare Workers runtime module, provided by the @astrojs/cloudflare
// adapter at build time. Astro's generated types do not include it, so we
// declare the surface used by middleware.
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
