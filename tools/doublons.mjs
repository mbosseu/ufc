/**
 * Resout la cannibalisation entre les pages ecrites a la main et leurs
 * jumelles importees du WordPress.
 *
 * Le probleme : `/articles/ufc-paris-2026-presentation.html` (ecrite a la
 * main pendant la refonte) et `/ufc-paris-2026-date-lieu-carte-enjeux/`
 * (importee) racontent la meme chose. Deux URL pour un sujet, elles se
 * disputent la meme requete et se privent mutuellement d'autorite.
 *
 * L'arbitrage : la version importee gagne. Elle est au slug deja indexe par
 * Google depuis le WordPress, elle est plus complete, et c'est elle qui
 * survivra a la bascule du domaine.
 *
 * Ce que fait ce script, et pas plus : il pose un `canonical` vers la version
 * qui fait foi et met la copie en `noindex`. Il ne supprime rien — retirer
 * quarante pages est une decision qui se demande, pas qui se prend dans un
 * script.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://ufc.fr";

/**
 * Page ecrite a la main → page qui fait foi.
 *
 * Les rubriques sans jumelle importee pointent vers leur page de categorie
 * generee : elle liste tout le corpus du sujet la ou la page ecrite a la main
 * en resumait trois lignes.
 */
const CANONIQUES = {
  "actualites.html": "/actualite-du-mma/",
  "clubs.html": "/clubs-mma-francais/",
  "champions.html": "/champions-mma-actuels/",
  "a-propos.html": "/a-propos/",
  "forum.html": "/forum-communaute-mma/",
  "analyses.html": "/categorie/analyses/",
  "evenements.html": "/categorie/evenements/",
  "resultats.html": "/categorie/resultats/",
  "combattants.html": "/categorie/combattants/",
  "interviews.html": "/categorie/interviews/",
  "organisations.html": "/organisation-mma-ultimate-fighting-championship/",
  "ufc-paris-2026.html": "/ufc-paris-2026-date-lieu-carte-enjeux/",
  "ufc-paris-2026-live.html": "/carte/ufc-paris-2026/",

  "articles/ufc-paris-2026-presentation.html": "/ufc-paris-2026-date-lieu-carte-enjeux/",
  "articles/ufc-paris-2026-carte.html": "/ufc-paris-2026-carte-complete-hooker-parnasse/",
  "articles/ufc-paris-2026-combattants-francais.html": "/ufc-paris-2026-combattants-francais/",
  "articles/ufc-paris-historique.html": "/ufc-paris-historique-accor-arena/",
  "articles/salahdine-parnasse-debuts-ufc.html": "/salahdine-parnasse-debuts-ufc-paris-2026/",
  "articles/hooker-citations.html": "/dan-hooker-citations-ufc-paris-parnasse/",
  "articles/wood-santos-forfait.html": "/ufc-paris-santos-forfait-wood/",
  "articles/gane-retour-entrainement.html": "/ciryl-gane-retour-entrainement-aspinall/",
  "articles/mma-france-guide.html": "/calendrier-mma-france-automne-2026/",
  "articles/ufc-paris-2026-resultats.html": "/ufc-paris-2026-resultats-complets/",
  "articles/ufc-paris-2026-bilan-francais.html": "/ufc-paris-2026-bilan-francais-resultats/",
  "clubs/cage-fight-toulouse.html": "/cage-fight-toulouse-club-mma/",
};

let traitees = 0;
let ignorees = 0;

for (const [copie, canonique] of Object.entries(CANONIQUES)) {
  const f = join(ROOT, copie);
  if (!existsSync(f)) { ignorees++; continue; }

  // La cible doit exister : poser un canonical vers une page absente
  // reviendrait a desindexer la copie sans rien mettre a la place.
  const cible = join(ROOT, canonique.replace(/^\//, ""), "index.html");
  if (!existsSync(cible)) {
    console.log(`  ! cible absente pour ${copie} → ${canonique}`);
    ignorees++;
    continue;
  }

  let html = readFileSync(f, "utf8");
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${SITE}${canonique}" />`);
  if (!/name="robots"/.test(html)) {
    html = html.replace(/(<link rel="canonical")/, '<meta name="robots" content="noindex, follow" />\n  $1');
  }
  writeFileSync(f, html, "utf8");
  traitees++;
}

console.log(`[doublons] ${traitees} copies renvoyees vers leur version de reference, ${ignorees} ignorees`);
