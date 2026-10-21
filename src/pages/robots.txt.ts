import type { APIRoute } from "astro";

// Built from `site` in astro.config.mjs, so the sitemap link always points at the real domain
export const GET: APIRoute = ({ site }) =>
  new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL("sitemap-index.xml", site).href}\n`);
