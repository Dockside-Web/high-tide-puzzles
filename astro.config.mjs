import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  //UPDATE THIS FOR EVERY NEW CLIENT
  site: "https://YOURDOMAIN.com",
  output: "static",
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [sitemap()],
  server: {
    watch: {
      usePolling: true,
      interval: 100 // checks for saves every 100ms
    }
  }
});
