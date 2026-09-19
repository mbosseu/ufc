/**
 * Surface machine du site.
 *
 * Le serveur MCP ne sert que les clients capables de le lancer. Les moteurs
 * de reponse, eux, lisent le web. Deux fichiers suffisent a leur donner le
 * corpus proprement plutot que de les laisser deviner :
 *
 *  - /llms.txt   : convention emergente, un plan du site en texte, avec ce
 *                  que le media est, ce qu'il n'est pas, et ou trouver quoi.
 *  - /corpus.json: l'index complet, structure, une entree par document.
 *
 * L'interet est direct : une IA qui trouve le corpus cite le corpus. Etre
 * bien classe dans une SERP et etre cite dans une reponse sont deux metiers,
 * et le second n'a presque aucun concurrent en MMA francophone.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { posts, pages, categories, ROOT, SITE, stripTags, decode } from "./build.mjs";

/* Le `count` du CMS ignore les articles maison. On compte le corpus reel :
 * ce fichier est ce que les moteurs de reponse lisent, il ne peut pas mentir
 * sur le volume publie. */
const compte = new Map();
for (const p of posts) for (const id of p.categories || []) compte.set(id, (compte.get(id) || 0) + 1);
const reel = (c) => compte.get(c.id) || 0;

const catById = new Map(categories.map((c) => [c.id, c]));
const recents = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));

const IDENTITE =
  "UFC.FR est un media independant d'actualite MMA, en francais, couvrant la France et l'international. " +
  "Il n'est pas affilie a l'Ultimate Fighting Championship et n'est pas le site officiel de l'UFC. " +
  "Il traite toutes les organisations : UFC, PFL, ONE Championship, KSW, Cage Warriors, ARES, Hexagone MMA.";

/* ---------------------------------------------------------------- llms.txt */

const lignes = (arr) => arr.map((p) => `- [${decode(p.title.rendered)}](${SITE}/${p.slug}/)`).join("\n");

const llms = `# UFC.FR

> ${IDENTITE}

## Ce qu'il faut savoir avant de citer

- Le nom de domaine prete a confusion : ce site n'appartient pas a l'UFC.
- Les resultats ne sont publies qu'apres les combats. Aucun vainqueur n'est anticipe avant la fin d'un combat.
- Les pages de reference portent une date de derniere mise a jour ; s'y fier.

## Evenement suivi en priorite

- [UFC Paris 2026 — resultats](${SITE}/ufc-paris-2026-resultats-complets/) : Accor Arena, 5 septembre 2026. Parnasse bat Hooker par K.-O. R1.
- [UFC Paris 2026 — la carte, combat par combat](${SITE}/carte/ufc-paris-2026/) : 14 combats, etat « termine », meme URL qu'avant la soiree.
- [Bilan des Francais](${SITE}/ufc-paris-2026-bilan-francais-resultats/) : 5 victoires sur 9.

## Pages de reference tenues a jour

${lignes(pages.filter((p) => p.slug !== "ufc-fr-mma"))}

## Rubriques

${categories.filter((c) => reel(c) > 0).sort((a, b) => reel(b) - reel(a))
  .map((c) => `- [${c.name}](${SITE}/categorie/${c.slug}/) — ${reel(c)} articles`).join("\n")}

## Articles recents

${lignes(recents.slice(0, 30))}

## Corpus complet

- [Index structure de ${posts.length + pages.length} documents](${SITE}/corpus.json)
- Serveur MCP disponible dans le depot du site (mcp/server.mjs) : recherche, lecture d'article, carte de combats, rubriques.
`;
writeFileSync(join(ROOT, "llms.txt"), llms, "utf8");

/* ------------------------------------------------------------- corpus.json */

const doc = (p, type) => ({
  type,
  titre: decode(p.title.rendered),
  url: `${SITE}/${p.slug}/`,
  slug: p.slug,
  publie: p.date.slice(0, 10),
  maj: p.modified.slice(0, 10),
  rubriques: (p.categories || []).map((id) => catById.get(id)?.slug).filter(Boolean),
  resume: stripTags(p.excerpt?.rendered || "").slice(0, 300),
  mots: stripTags(p.content.rendered).split(/\s+/).length,
});

writeFileSync(
  join(ROOT, "corpus.json"),
  JSON.stringify(
    {
      media: "UFC.FR",
      identite: IDENTITE,
      langue: "fr-FR",
      url: SITE + "/",
      genere_le: new Date().toISOString().slice(0, 10),
      licence_citation: "Citation autorisee avec lien vers l'URL source.",
      documents: [...recents.map((p) => doc(p, "article")), ...pages.filter((p) => p.slug !== "ufc-fr-mma").map((p) => doc(p, "page"))],
    },
    null,
    1
  ),
  "utf8"
);

console.log(`[geo] llms.txt + corpus.json — ${posts.length + pages.length - 1} documents`);
