import type { APIRoute } from "astro";

const site = import.meta.env.SITE;
const basePath = import.meta.env.BASE_URL;
const sitemapUrl = new URL(`${basePath}sitemap.xml`, site).toString();

export const GET: APIRoute = () => {
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemapUrl}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
};
