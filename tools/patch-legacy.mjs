/**
 * Remise à niveau des 39 pages écrites à la main, avant leur remplacement
 * progressif par le générateur.
 *
 * Trois défauts se corrigent ici en une passe, parce qu'ils appartiennent à
 * la même classe — « ce que le document déclare de lui-même » :
 *   1. `class="js-motion"` en dur masquait l'en-tête et le héros tant que le
 *      JavaScript n'avait pas répondu. JS coupé = page amputée, définitivement.
 *   2. Aucune de ces pages n'avait de favicon ni de carte de partage.
 *   3. Les pages de travail internes n'étaient pas marquées `noindex`.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://ufc.fr";

// Pages de coulisses : utiles à l'équipe, sans valeur pour un lecteur, et
// nuisibles dans l'index d'un site d'actualité.
const INTERNES = new Set(["audit.html", "redaction.html", "seo-suivi.html", "calendrier-editorial.html"]);

function collect(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if ([".git", "node_modules", "data", "media", "UFC", "tools"].includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) collect(full, out);
    else if (name.endsWith(".html") && !full.includes("/tools/")) out.push(full);
  }
  return out;
}

let patched = 0;
for (const file of collect(ROOT)) {
  // Les pages produites par le générateur sont déjà conformes.
  if (file.endsWith("/index.html") && file !== join(ROOT, "index.html")) continue;

  let html = readFileSync(file, "utf8");
  const before = html;
  const rel = file.slice(ROOT.length + 1);
  const depth = rel.split("/").length - 1;
  const up = depth ? "../".repeat(depth) : "";

  // 1. Le contenu ne dépend plus du JavaScript pour être visible.
  html = html.replace(/<html lang="fr" class="js-motion">/, '<html lang="fr">');

  // 2. Favicon + carte de partage, injectés juste avant la feuille de style.
  if (!/rel="icon"/.test(html)) {
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "UFC.FR";
    const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
    const canon = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || `${SITE}/${rel}`;
    const block = `  <meta property="og:site_name" content="UFC.FR" />
  <meta property="og:locale" content="fr_FR" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
  <meta property="og:url" content="${canon}" />
  <meta property="og:image" content="${SITE}/media/brand/ufc-fr-og.jpg" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${desc}" />
  <meta name="twitter:image" content="${SITE}/media/brand/ufc-fr-og.jpg" />
  <link rel="icon" href="/media/brand/favicon-32.png" sizes="32x32" />
  <link rel="icon" href="/media/brand/favicon-192.png" sizes="192x192" />
  <link rel="apple-touch-icon" href="/media/brand/favicon-192.png" />
`;
    html = html.replace(/(  <link rel="stylesheet" href="[^"]*site\.css" \/>)/, block + "$1");
  }

  // 3. Les polices viennent de chez nous, ici comme sur les pages generees.
  //
  // Trente-huit pages ecrites a la main chargeaient encore les trois familles
  // depuis fonts.googleapis.com — deux resolutions DNS, deux poignees de main
  // TLS, et une requete vers Google depuis le navigateur de chaque lecteur.
  // Sur un reseau ou ce domaine ne repond pas, la requete pendait douze
  // secondes avant d'echouer.
  if (/fonts\.googleapis\.com/.test(html)) {
    html = html
      .replace(/[ \t]*<link rel="preconnect" href="https:\/\/fonts\.(?:googleapis|gstatic)\.com"[^>]*>\n?/g, "")
      .replace(
        /[ \t]*<link[^>]*href="https:\/\/fonts\.googleapis\.com\/css2[^"]*"[^>]*>\n?/g,
        ""
      );
    if (!/css\/polices\.css/.test(html)) {
      html = html.replace(
        /(  <link rel="stylesheet" href="[^"]*site\.css" \/>)/,
        `  <link rel="preload" as="font" type="font/woff2" href="/fonts/newsreader.woff2" crossorigin />\n` +
          `  <link rel="preload" as="font" type="font/woff2" href="/fonts/outfit.woff2" crossorigin />\n` +
          `  <link rel="stylesheet" href="/css/polices.css" />\n$1`
      );
    }
  }

  // 4. Coulisses hors index.
  if (INTERNES.has(rel) && !/name="robots"/.test(html)) {
    html = html.replace(/(<title>)/, '<meta name="robots" content="noindex, follow" />\n  $1');
  }

  if (html !== before) {
    writeFileSync(file, html, "utf8");
    patched++;
  }
}
console.log(`[héritage] ${patched} pages remises à niveau`);
