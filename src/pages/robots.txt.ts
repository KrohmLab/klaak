// robots.txt généré depuis src/data/site.json : tant que `indexable` est à false, le site reste hors moteurs.
import { site } from "../lib/content";

export const GET = () =>
  new Response(site.indexable ? `User-agent: *\nAllow: /\nDisallow: /styleguide\n\nSitemap: ${site.url}/sitemap.xml\n` : "User-agent: *\nDisallow: /\n", {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
