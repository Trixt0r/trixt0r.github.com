import { defineConfig } from "astro/config";

const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "homepage";
const isUserSite = repoName.endsWith(".github.io");
const base = process.env.BASE_PATH ?? (process.env.GITHUB_ACTIONS === "true" && !isUserSite ? `/${repoName}/` : "/");
const site = process.env.SITE_URL ?? `https://example.com${base}`;

export default defineConfig({
  site,
  base,
  output: "static"
});
