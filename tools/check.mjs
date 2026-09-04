/**
 * Controle avant livraison. Ce qui est verifie ici correspond aux defauts
 * qui ont deja ete constates sur ce projet : c'est un registre executable,
 * pas une liste de bonnes pratiques generiques.
 */
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CANONIQUES, ALIAS, REDIRECTS } from "./canoniques.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKIP = new Set([".git", "node_modules", "data", "UFC", "tools", "mcp", ".registre", ".research", ".pages"]);
const pages = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    if (SKIP.has(n)) continue;
    const f = join(d, n);
    statSync(f).isDirectory() ? walk(f) : n.endsWith(".html") && pages.push(f);
  }
})(ROOT);

let fails = 0;
const fail = (m) => { console.log("  ✗ " + m); fails++; };

console.log(`[controle] ${pages.length} pages`);

// 1. Aucune trace du CMS d'origine.
for (const p of pages) {
  const h = readFileSync(p, "utf8");
  const rel = p.slice(ROOT.length + 1);
  if (/wp-content|wp-json|class="[^"]*wp-|elementor/i.test(h)) fail(`trace CMS dans ${rel}`);
  if (/class="js-motion"/.test(h)) fail(`js-motion code en dur dans ${rel}`);
  if (!/rel="icon"/.test(h)) fail(`favicon absent de ${rel}`);
  if (!/og:title/.test(h)) fail(`Open Graph absent de ${rel}`);
  // Un gabarit mal echappe laisse `${...}` dans le document : le lien
  // devient inatteignable et rien d'autre ne le signale.
  if (/\$\{/.test(h)) fail(`litteral de gabarit non evalue dans ${rel}`);
  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1 && !/name="robots" content="noindex/.test(h)) fail(`${h1} h1 dans ${rel}`);
  // 2. Aucune image repetee dans une page.
  //    Ajoute apres avoir livre une galerie ou neuf combattants differents
  //    portaient la meme photo de ceinture : rien ne le signalait, ni le
  //    build, ni les liens morts, ni la console.
  // Les copies mises en noindex sont des pages superseedees qu'on garde
  // accessibles sans les entretenir : leur repetition d'images ne se corrige
  // pas, elle disparaitra avec elles.
  if (/name="robots" content="noindex/.test(h)) { /* controle allege */ }
  else {
  // La marque revient en en-tete et en pied : c'est voulu, elle est exclue.
  const imgs = [...h.matchAll(/<img[^>]+src="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((src) => !/logo\/|media\/brand\//.test(src));
  const compte = {};
  for (const src of imgs) compte[src] = (compte[src] || 0) + 1;
  for (const [src, n] of Object.entries(compte)) {
    if (n > 1) fail(`${src} apparait ${n} fois dans ${rel}`);
  }
  }

  // 3. Aucune reference locale morte.
  for (const a of new Set([...h.matchAll(/(?:src|href)="(\/[^"]+\.(?:jpg|jpeg|png|webp|css|js|gif|svg))"/g)].map((m) => m[1]))) {
    if (!existsSync(join(ROOT, a))) fail(`${a} manquant (${rel})`);
  }
}
/**
 * Un article a du texte. C'est le controle qui manquait.
 *
 * Cinquante-et-un articles sur quatre-vingt-douze sont partis en ligne avec
 * un titre, une photo, une signature et rien d'autre : le nettoyeur coupait
 * le corps au premier marqueur du constructeur de pages, et sur ces
 * articles-la ce marqueur est le septieme caractere. La page pesait moins
 * lourd, ce qui ressemblait a une victoire ; c'etait l'article qui manquait.
 *
 * Une suppression se mesure a ce qui reste. Ici, on compte.
 */
for (const p of pages) {
  const h = readFileSync(p, "utf8");
  const rel = p.slice(ROOT.length + 1);
  const m = h.match(/<div class="prose"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<aside|<div class="wrap)/);
  if (!m) continue;
  const texte = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (texte.length < 200) fail(`corps de ${texte.length} signes seulement dans ${rel}`);
}

/**
 * Deux pages ne se presentent jamais aux moteurs sous la meme identite.
 *
 * Le CMS livrait des champs SEO copies-colles : la fiche de Tang Kai
 * s'annoncait sous le surnom d'Oumar Kane, celle d'Aboubakar Younousov
 * decrivait Aboubacar Bathily. Six pages mentaient a Google et aux moteurs
 * de reponse sur ce qu'elles contenaient — sur un site dont c'est la
 * strategie.
 *
 * Le generateur ecarte desormais tout champ duplique, mais la garde reste
 * ici : c'est elle qui refuse la mise en ligne si la regle cede un jour.
 * Les copies mises en noindex sont exclues — elles portent volontairement le
 * meme texte que leur version de reference, avec un canonique qui le dit.
 */
const titresVus = new Map();
const descsVus = new Map();
for (const p of pages) {
  const h = readFileSync(p, "utf8");
  if (/noindex/.test(h)) continue;
  const rel = p.slice(ROOT.length + 1);
  const t = (h.match(/<title>([\s\S]*?)<\/title>/) || [])[1];
  const d = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1];
  if (t) titresVus.set(t, (titresVus.get(t) || []).concat(rel));
  if (d) descsVus.set(d, (descsVus.get(d) || []).concat(rel));
}
for (const [t, l] of titresVus) if (l.length > 1) fail(`titre partage par ${l.length} pages indexables : « ${t.slice(0, 60)} » — ${l.join(", ")}`);
for (const [d, l] of descsVus) if (l.length > 1) fail(`description partagee par ${l.length} pages indexables : « ${d.slice(0, 60)}… » — ${l.join(", ")}`);

/* Un titre de resultat de recherche se coupe au-dela de 65 signes : ce qui
 * depasse n'est pas lu, et la fin d'un titre porte souvent le sujet. */
for (const p of pages) {
  const h = readFileSync(p, "utf8");
  if (/noindex/.test(h)) continue;
  const t = (h.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "";
  if (t.length > 65) fail(`titre de ${t.length} signes (coupe a 65) dans ${p.slice(ROOT.length + 1)} : « ${t} »`);
  const d = (h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
  if (d.length > 165) fail(`description de ${d.length} signes (coupee a 165) dans ${p.slice(ROOT.length + 1)}`);
}

/**
 * `vercel.json` ne contient que ce que Vercel connait.
 *
 * JSON n'accepte pas de commentaires, alors les explications avaient ete
 * mises dans des cles `_note_trailingSlash` et `_note_build`. Vercel refuse
 * tout fichier de configuration portant une propriete inconnue :
 *
 *   Invalid request: should NOT have additional property `_note_trailingSlash`.
 *
 * Plus aucun deploiement ne partait, et le site est reste seize heures sur
 * une version perimee — sans que la cause soit visible ailleurs que dans la
 * fenetre d'import de Vercel. Les explications vivent maintenant dans
 * docs-vercel.md, ou elles ne cassent rien.
 */
const CLES_VERCEL = new Set([
  "$schema", "framework", "installCommand", "buildCommand", "devCommand",
  "outputDirectory", "public", "trailingSlash", "cleanUrls", "headers",
  "redirects", "rewrites", "regions", "functions", "crons", "images",
  "git", "ignoreCommand", "github", "builds", "routes",
]);
try {
  const vercel = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
  for (const k of Object.keys(vercel))
    if (!CLES_VERCEL.has(k)) fail(`vercel.json : propriete « ${k} » inconnue de Vercel — l'import sera refuse`);
  const posees = new Map((vercel.redirects || []).map((r) => [r.source, r.destination]));
  for (const r of REDIRECTS) {
    if (posees.get(r.source) !== r.destination) fail(`vercel.json : ${r.source} devrait aller vers ${r.destination}`);
  }
  if ((vercel.redirects || []).length !== REDIRECTS.length) {
    fail(`vercel.json : ${(vercel.redirects || []).length} redirections, ${REDIRECTS.length} attendues`);
  }
} catch (e) {
  if (e.code !== "ENOENT") fail(`vercel.json illisible : ${e.message}`);
}

for (const [copie, canonique] of Object.entries(CANONIQUES)) {
  const cible = join(ROOT, canonique.replace(/^\//, ""), "index.html");
  if (!existsSync(cible)) fail(`redirection ${copie} → ${canonique} : cible absente`);
}
for (const [depuis, vers] of Object.entries(ALIAS)) {
  const cible = join(ROOT, vers.replace(/^\//, ""), "index.html");
  if (!existsSync(cible)) fail(`alias ${depuis} → ${vers} : cible absente`);
}

console.log(fails ? `\n${fails} defaut(s).` : "\nAucun defaut.");
process.exit(fails ? 1 : 0);
