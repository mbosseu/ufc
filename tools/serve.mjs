/**
 * Serveur local. Sert les dossiers en resolvant /slug/ vers son index.html,
 * exactement comme Vercel : sans ca, on developpe contre un comportement
 * different de la production et on decouvre les 404 apres le deploiement.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.PORT || 4321;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".gif": "image/gif", ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const candidates = url.endsWith("/") ? [join(ROOT, url, "index.html")] : [join(ROOT, url), join(ROOT, url, "index.html")];
  for (const file of candidates) {
    try {
      const info = await stat(file);
      if (!info.isFile()) continue;
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
      res.end(await readFile(file));
      return;
    } catch { /* candidat suivant */ }
  }
  res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
  res.end("<h1>404</h1>");
}).listen(PORT, () => console.log(`UFC.FR → http://localhost:${PORT}`));
