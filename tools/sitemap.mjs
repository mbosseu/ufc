/**
 * Sitemap unique, construit depuis ce qui existe réellement sur le disque.
 * Le générer à partir d'une liste tenue à la main, c'est garantir qu'un jour
 * il décrira un site qui n'existe plus.
 */
import { readdirSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://ufc.fr";
const IGNORE = new Set([".git", "node_modules", "data", "media", "UFC", "tools", "mcp", "img", "css", "js", "logo", ".registre", ".research", ".pages"]);

const urls = new Map([["/", ""]]);

function dateSignificative(html) {
  const trouve =
    html.match(/"dateModified"\s*:\s*"([^"]+)"/) ||
    html.match(/"datePublished"\s*:\s*"([^"]+)"/);
  if (!trouve || Number.isNaN(Date.parse(trouve[1]))) return "";
  return trouve[1];
}

function xml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

(function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (IGNORE.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name.endsWith(".html")) {
      // Windows : join() produit des \, inutilisables dans une URL.
      const rel = full.slice(ROOT.length + 1).replace(/\\/g, "/");
      const html = readFileSync(full, "utf8");
      // Les coulisses sont en noindex : les lister serait se contredire.
      if (/noindex/.test(html.slice(0, 1500))) continue;
      let path;
      if (rel === "index.html") path = "/";
      else if (rel.endsWith("/index.html")) path = "/" + rel.slice(0, -"index.html".length);
      else {
        // Anciennes pages .html plates (redirigées) : hors sitemap.
        continue;
      }
      // Canonique site : trailing slash (vercel.json trailingSlash: true).
      if (path !== "/" && !path.endsWith("/")) path += "/";
      urls.set(path, dateSignificative(html));
    }
  }
})(ROOT);

const body = [...urls.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([u, lastmod]) =>
    `  <url><loc>${xml(SITE + u)}</loc>${lastmod ? `<lastmod>${xml(lastmod)}</lastmod>` : ""}</url>`
  )
  .join("\n");
writeFileSync(join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, "utf8");
console.log(`[sitemap] ${urls.size} URL`);
