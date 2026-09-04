/**
 * Controle avant livraison. Ce qui est verifie ici correspond aux defauts
 * qui ont deja ete constates sur ce projet : c'est un registre executable,
 * pas une liste de bonnes pratiques generiques.
 */
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
/** Les adresses de page sans document, comptees une fois pour tout le site. */
const liensMorts = new Map();

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
  /* On compare les noms de fichier, pas les URL. Depuis que les listes
   * servent des vignettes, `/img/hooker.webp` et
   * `/media/vignettes/hooker.webp` sont la meme photo sous deux adresses :
   * le controle les laissait passer, et l'accueil montrait deux fois le meme
   * homme a deux cents pixels d'ecart. */
  const compte = {};
  const exemples = {};
  for (const src of imgs) {
    const cle = src.split("/").pop().replace(/\.[a-z0-9]+$/i, "");
    compte[cle] = (compte[cle] || 0) + 1;
    (exemples[cle] = exemples[cle] || []).push(src);
  }
  for (const [cle, n] of Object.entries(compte)) {
    if (n > 1) fail(`${cle} apparait ${n} fois dans ${rel} (${[...new Set(exemples[cle])].join(", ")})`);
  }
  }

  // 3. Aucune reference locale morte.
  for (const a of new Set([...h.matchAll(/(?:src|href)="(\/[^"]+\.(?:jpg|jpeg|png|webp|css|js|gif|svg))"/g)].map((m) => m[1]))) {
    if (!existsSync(join(ROOT, a))) fail(`${a} manquant (${rel})`);
  }

  /* 3 bis. Aucun lien de navigation mort.
   *
   * La regle ci-dessus ne regardait que les fichiers portant une extension :
   * images, feuilles, scripts. Les liens de page — ceux qui composent la
   * navigation — n'etaient pas verifies du tout. Resultat : « Resultats »
   * dans la barre principale et le bouton rouge « Paris 2026 », present sur
   * chacune des cent soixante-trois pages, renvoyaient un 404 en
   * production. Sept adresses, huit cent quatre-vingt-deux liens.
   *
   * Une adresse en /slug/ doit correspondre a slug/index.html. Un fichier
   * .html a la racine ne suffit pas : le serveur ne fait pas la conversion,
   * ni en local ni chez l'hebergeur — c'est verifie, pas suppose. */
  for (const a of new Set([...h.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]))) {
    if (/\.[a-z0-9]{2,5}$/i.test(a)) continue; // traite par la regle ci-dessus
    const cible = a === "/" ? "index.html" : join(a.replace(/^\/|\/$/g, ""), "index.html");
    if (!existsSync(join(ROOT, cible))) liensMorts.set(a, (liensMorts.get(a) || 0) + 1);
  }
}
for (const [a, n] of [...liensMorts].sort((x, y) => y[1] - x[1])) {
  fail(`${a} n'existe pas — ${n} lien${n > 1 ? "s" : ""} vers cette adresse`);
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
} catch (e) {
  if (e.code !== "ENOENT") fail(`vercel.json illisible : ${e.message}`);
}

/**
 * Aucun cadre d'image ne reste vide.
 *
 * Le bloc « a la une » de l'accueil rendait `<div class="ed-lead-media">
 * </div>` — cinq cents pixels de gris plat au milieu de la page. La fonction
 * qui pose les images renvoie une chaine vide quand la photo a deja servi
 * ailleurs sur la page, et personne ne verifiait ce que ca laissait.
 *
 * Un doublon se remarque ; un trou se remarque davantage.
 */
for (const p of pages) {
  const h = readFileSync(p, "utf8");
  const rel = p.slice(ROOT.length + 1);
  /* Une vignette de roster sans image : le lien est un rectangle noir avec
   * un nom dessus. La tete d'affiche de l'accueil est sortie ainsi, sur deux
   * rangees, parce que `pic()` rend une chaine vide quand la photo a deja
   * servi. Ce controle-ci regarde un <a> de roster qui ne contient aucune
   * image, pas un cadre vide : le balisage n'a pas de conteneur intermediaire. */
  for (const m of h.matchAll(/<a[^>]*class="[^"]*\broster-item\b[^"]*"[\s\S]*?<\/a>/g)) {
    if (!/<img\b/.test(m[0])) fail(`vignette de roster sans image dans ${rel}`);
  }
  for (const bloc of h.matchAll(/<div class="roster">([\s\S]*?)<\/div>\s*<\/div>/g)) {
    const liens = bloc[1].match(/<a\b[^>]*>[\s\S]*?<\/a>/g) || [];
    const vides = liens.filter((a) => !/<img\b/.test(a)).length;
    if (vides) fail(`${vides} vignette(s) de roster sans image dans ${rel}`);
  }
  for (const classe of ["ed-lead-media", "media", "salle-media", "ed-keys-photo", "ed-portrait-media"]) {
    const re = new RegExp(`<(?:div|a|figure)[^>]*class="[^"]*\\b${classe}\\b[^"]*"[^>]*>\\s*</(?:div|a|figure)>`, "g");
    const n = (h.match(re) || []).length;
    if (n) fail(`${n} cadre(s) « ${classe} » sans image dans ${rel}`);
  }
}

/* ------------------------------------------------------- les contrats --
 * Ce qu'une page donnee doit contenir, quoi qu'il arrive.
 *
 * Ce controle existe a cause d'une disparition silencieuse. Les intertitres
 * du corps ont recu un identifiant pour alimenter le sommaire du rail ;
 * `blocsClubs` reconnaissait le sien a son texte exact — `<h2>Portraits
 * publiés</h2>` — et ne l'a plus trouve. L'annuaire des quatorze salles a
 * disparu de la page clubs. Le build n'a rien dit, le controle non plus, et
 * les liens etaient tous valides : il ne restait simplement plus rien a
 * lier. Une page peut maigrir de moitie sans qu'aucune regle generale ne s'en
 * apercoive.
 *
 * On ne peut pas decrire toutes les pages. On decrit celles dont la
 * disparition d'un bloc coute quelque chose — un engagement contractuel, une
 * rubrique entiere, le coeur d'une page.
 */
const CONTRATS = [
  ["clubs-mma-francais/index.html", [
    [/class="salle"/g, 14, "fiches de l'annuaire"],
    [/https:\/\/club-mma-toulouse\.com/g, 1, "lien contractuel Cage Fight"],
  ]],
  ["index.html", [
    [/class="salle"/g, 3, "fiches de salle en accueil"],
    [/https:\/\/club-mma-toulouse\.com/g, 1, "lien contractuel Cage Fight"],
    [/boxing-center-toulouse-etats-unis/g, 1, "renvoi Boxing Center États-Unis"],
    [/boxing-center-ramonville-saint-agne/g, 1, "renvoi Boxing Center Ramonville"],
    [/class="row"/g, 8, "lignes du fil"],
    [/class="roster"/g, 1, "grille des combattants"],
  ]],
  ["actualite-du-mma/index.html", [[/class="card"/g, 80, "cartes du fil"]]],
  ["champions-mma-actuels/index.html", [[/<h2/g, 3, "sections"]]],
  ["carte/ufc-paris-2026/index.html", [[/class="bout/g, 14, "combats de la carte"]]],
];
for (const [rel, regles] of CONTRATS) {
  const f = join(ROOT, rel);
  if (!existsSync(f)) { fail(`page attendue absente : ${rel}`); continue; }
  const h = readFileSync(f, "utf8");
  for (const [re, mini, quoi] of regles) {
    const n = (h.match(re) || []).length;
    if (n < mini) fail(`${rel} : ${n} ${quoi} au lieu de ${mini} au moins`);
  }
}

console.log(fails ? `\n${fails} defaut(s).` : "\nAucun defaut.");
process.exit(fails ? 1 : 0);
