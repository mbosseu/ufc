/**
 * Audit SEO HTTP de la version publiee.
 *
 * Usage : npm run audit:seo
 *         node tools/seo-audit.mjs https://previsualisation.example
 */
const BASE = (process.argv[2] || process.env.SEO_BASE_URL || "https://ufc.fr").replace(/\/$/, "");
const SITE = (process.env.SEO_CANONICAL_URL || "https://ufc.fr").replace(/\/$/, "");
const USER_AGENT =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const PARALLEL = 8;
const TIMEOUT = 20000;

const erreurs = [];
const avertissements = [];
const titres = new Map();
const descriptions = new Map();
const mesures = [];

function erreur(message) {
  erreurs.push(message);
}

function avertir(message) {
  avertissements.push(message);
}

function decodeXml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function meta(html, name) {
  const direct = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)`, "i"));
  if (direct) return direct[1];
  const inverse = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, "i"));
  return inverse ? inverse[1] : "";
}

function property(html, name) {
  const direct = html.match(new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']*)`, "i"));
  if (direct) return direct[1];
  const inverse = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${name}["']`, "i"));
  return inverse ? inverse[1] : "";
}

function memoriser(map, valeur, url) {
  if (!valeur) return;
  map.set(valeur, [...(map.get(valeur) || []), url]);
}

async function requete(url, options = {}) {
  const controleur = new AbortController();
  const timer = setTimeout(() => controleur.abort(), TIMEOUT);
  const debut = performance.now();
  try {
    const response = await fetch(url, {
      redirect: options.redirect || "follow",
      headers: { "user-agent": USER_AGENT, accept: options.accept || "text/html,*/*;q=0.8" },
      signal: controleur.signal,
    });
    mesures.push(performance.now() - debut);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function texte(url, options = {}) {
  const response = await requete(url, options);
  return { response, body: await response.text() };
}

async function auditPage(entree) {
  const url = entree.loc;
  const cible = new URL(new URL(url).pathname, `${BASE}/`).href;
  try {
    const { response, body } = await texte(cible);
    if (response.status !== 200) {
      erreur(`${url} renvoie ${response.status}`);
      return;
    }
    if (response.url !== cible) erreur(`${cible} aboutit sur ${response.url}`);
    if (!/text\/html/i.test(response.headers.get("content-type") || "")) {
      erreur(`${url} n'est pas servi en HTML`);
    }
    const xRobots = response.headers.get("x-robots-tag") || "";
    const robots = meta(body, "robots");
    if (/noindex/i.test(xRobots) || /noindex/i.test(robots)) erreur(`${url} est en noindex`);
    if (!/max-image-preview:large/i.test(robots)) erreur(`${url} n'autorise pas les grandes images`);

    const canonical = (body.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i) || [])[1] || "";
    if (canonical !== url) erreur(`${url} declare la canonical ${canonical || "absente"}`);
    const feed = (body.match(/<link[^>]+type=["']application\/rss\+xml["'][^>]+href=["']([^"']+)/i) || [])[1] || "";
    if (feed !== `${SITE}/feed.xml`) erreur(`${url} ne declare pas le flux RSS canonique`);

    const h1 = (body.match(/<h1[\s>]/gi) || []).length;
    if (h1 !== 1) erreur(`${url} contient ${h1} H1`);
    const title = decodeXml((body.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
    const description = decodeXml(meta(body, "description")).trim();
    if (!title) erreur(`${url} n'a pas de title`);
    if (!description) erreur(`${url} n'a pas de meta description`);
    if (title.length > 65) erreur(`${url} a un title de ${title.length} signes`);
    if (description.length > 165) erreur(`${url} a une description de ${description.length} signes`);
    memoriser(titres, title, url);
    memoriser(descriptions, description, url);

    const schemas = [];
    for (const match of body.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        schemas.push(JSON.parse(match[1]));
      } catch {
        erreur(`${url} contient un JSON-LD invalide`);
      }
    }
    if (!schemas.length) erreur(`${url} n'a pas de donnees structurees`);
    if (property(body, "og:type") === "article") {
      const article = schemas.find((schema) => schema["@type"] === "NewsArticle");
      if (!article) erreur(`${url} est un article sans schema NewsArticle`);
      else {
        for (const champ of ["headline", "datePublished", "dateModified", "author", "publisher", "image"]) {
          if (!article[champ]) erreur(`${url} : NewsArticle.${champ} absent`);
        }
        if (article.dateModified && entree.lastmod !== article.dateModified) {
          erreur(`${url} : lastmod ${entree.lastmod || "absent"}, schema ${article.dateModified}`);
        }
      }
    }
  } catch (cause) {
    erreur(`${url} inaccessible : ${cause.name === "AbortError" ? "delai depasse" : cause.message}`);
  }
}

async function lots(items, travail) {
  let index = 0;
  const ouvriers = Array.from({ length: Math.min(PARALLEL, items.length) }, async () => {
    while (index < items.length) {
      const courant = items[index++];
      await travail(courant);
    }
  });
  await Promise.all(ouvriers);
}

console.log(`[audit SEO] ${BASE}`);

if (BASE === SITE) {
  const www = new URL(SITE);
  www.hostname = `www.${www.hostname.replace(/^www\./, "")}`;
  try {
    const response = await requete(www.href, { redirect: "manual" });
    if (![301, 308].includes(response.status)) {
      erreur(`${www.href} doit rediriger en 301/308, statut recu : ${response.status}`);
    }
    const destination = new URL(response.headers.get("location") || "", www).href;
    if (destination !== `${SITE}/`) erreur(`${www.href} redirige vers ${destination || "nulle part"}`);
  } catch (cause) {
    erreur(`${www.href} inaccessible : ${cause.message}`);
  }
}

try {
  const response = await requete(`${BASE}/controle-404-seo-${Date.now()}/`);
  if (response.status !== 404) erreur(`une URL inexistante renvoie ${response.status} au lieu de 404`);
} catch (cause) {
  erreur(`controle 404 impossible : ${cause.message}`);
}

let entrees = [];
try {
  const { response, body } = await texte(`${BASE}/robots.txt`, { accept: "text/plain,*/*" });
  if (response.status !== 200) erreur(`robots.txt renvoie ${response.status}`);
  if (!/text\/plain/i.test(response.headers.get("content-type") || "")) avertir("robots.txt n'est pas servi en text/plain");
  if (!body.includes(`Sitemap: ${SITE}/sitemap.xml`)) erreur("robots.txt ne declare pas sitemap.xml");
  if (!body.includes(`Sitemap: ${SITE}/feed.xml`)) erreur("robots.txt ne declare pas feed.xml");
} catch (cause) {
  erreur(`robots.txt inaccessible : ${cause.message}`);
}

try {
  const { response, body } = await texte(`${BASE}/sitemap.xml`, { accept: "application/xml,text/xml,*/*" });
  if (response.status !== 200) erreur(`sitemap.xml renvoie ${response.status}`);
  entrees = [...body.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => ({
    loc: decodeXml((match[1].match(/<loc>([^<]+)<\/loc>/) || [])[1] || ""),
    lastmod: decodeXml((match[1].match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1] || ""),
  }));
  if (!entrees.length) erreur("sitemap.xml ne contient aucune URL");
  const uniques = new Set(entrees.map((entree) => entree.loc));
  if (uniques.size !== entrees.length) erreur("sitemap.xml contient des URL dupliquees");
  for (const entree of entrees) {
    if (!entree.loc.startsWith(`${SITE}/`)) erreur(`origine incoherente dans le sitemap : ${entree.loc}`);
    if (entree.lastmod && Number.isNaN(Date.parse(entree.lastmod))) erreur(`lastmod invalide : ${entree.lastmod}`);
  }
  const dates = entrees.filter((entree) => entree.lastmod).length;
  if (dates < Math.floor(entrees.length * 0.7)) avertir(`seulement ${dates}/${entrees.length} URL ont un lastmod`);
} catch (cause) {
  erreur(`sitemap.xml inaccessible : ${cause.message}`);
}

try {
  const { response, body } = await texte(`${BASE}/feed.xml`, { accept: "application/rss+xml,application/xml,*/*" });
  if (response.status !== 200) erreur(`feed.xml renvoie ${response.status}`);
  const items = [...body.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>[\s\S]*?<\/item>/g)].map((match) => decodeXml(match[1]));
  if (!items.length) erreur("feed.xml ne contient aucun article");
  for (const url of items) if (!url.startsWith(`${SITE}/`)) erreur(`origine incoherente dans le flux : ${url}`);
} catch (cause) {
  erreur(`feed.xml inaccessible : ${cause.message}`);
}

await lots(entrees, auditPage);

for (const [title, urls] of titres) {
  if (urls.length > 1) erreur(`title duplique « ${title} » : ${urls.join(", ")}`);
}
for (const [description, urls] of descriptions) {
  if (urls.length > 1) erreur(`description dupliquee « ${description.slice(0, 70)}... » : ${urls.join(", ")}`);
}

const moyenne = mesures.length ? Math.round(mesures.reduce((total, mesure) => total + mesure, 0) / mesures.length) : 0;
const maximum = mesures.length ? Math.round(Math.max(...mesures)) : 0;
console.log(`  ${entrees.length} URL du sitemap controlees`);
console.log(`  reponse moyenne ${moyenne} ms, maximum ${maximum} ms`);
for (const message of avertissements) console.log(`  ! ${message}`);
for (const message of erreurs.slice(0, 60)) console.log(`  x ${message}`);
if (erreurs.length > 60) console.log(`  x ... ${erreurs.length - 60} autres erreurs`);
console.log(erreurs.length ? `\n${erreurs.length} erreur(s).` : "\nAudit HTTP valide.");
process.exit(erreurs.length ? 1 : 0);
