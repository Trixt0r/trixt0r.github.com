import { createServer } from "node:http";
import { readFile, stat, mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const distDir = path.resolve("dist");
const outputDir = path.join(distDir, "pdf");
function normalizeBasePath(value) {
  if (!value || value === "/") {
    return "/";
  }

  if (/^[A-Za-z]:\//.test(value)) {
    const segments = value.replace(/\\/g, "/").split("/").filter(Boolean);
    const lastSegment = segments.at(-1);
    return lastSegment ? `/${lastSegment}/` : "/";
  }

  return value.startsWith("/") ? value : `/${value}/`;
}

const basePath = normalizeBasePath(process.env.BASE_PATH ?? "/");
const port = Number(process.env.PDF_PORT ?? 4173);
const locales = ["de", "en", "ru"];

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

function resolveFilePath(urlPath) {
  const normalized = decodeURIComponent(urlPath.split("?")[0]);
  const relativePath = normalized.replace(/^\//, "");
  const directPath = path.join(distDir, relativePath);
  const indexPath = path.join(distDir, relativePath, "index.html");
  return { directPath, indexPath };
}

const server = createServer(async (req, res) => {
  try {
    const { directPath, indexPath } = resolveFilePath(req.url ?? "/");

    try {
      const directStat = await stat(directPath);
      if (directStat.isFile()) {
        const file = await readFile(directPath);
        res.writeHead(200, { "Content-Type": contentType(directPath) });
        res.end(file);
        return;
      }
    } catch {
      // fall through to index.html resolution
    }

    const file = await readFile(indexPath);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(file);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

await mkdir(outputDir, { recursive: true });

await new Promise((resolve) => server.listen(port, resolve));

const browser = await chromium.launch();

try {
  for (const locale of locales) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1080 }
    });
    const url = `http://127.0.0.1:${port}${basePath}${locale}/cv/`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.pdf({
      path: path.join(outputDir, `cv-${locale}.pdf`),
      format: "A4",
      margin: {
        top: "12mm",
        right: "12mm",
        bottom: "12mm",
        left: "12mm"
      },
      printBackground: true
    });
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve(undefined))));
}
