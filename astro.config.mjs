// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

// Site 100 % statique : Astro génère dist/, servi en assets par le Worker Cloudflare (voir wrangler.jsonc).
export default defineConfig({
  output: "static",
  // `site` (URL canonique) sera renseigné quand le nom de domaine final sera connu : voir src/data/site.json.
  vite: { plugins: [tailwindcss()] },
});
