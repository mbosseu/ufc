#!/usr/bin/env node
/**
 * Serveur MCP — UFC.FR
 *
 * Expose le corpus MMA du site a un assistant : articles, carte de combats,
 * champions, clubs, organisations. L'enjeu n'est pas le confort d'un outil
 * interne, c'est le referencement dans les moteurs de reponse : une IA qui
 * peut interroger la source cite la source. Etre trouve dans une SERP et
 * etre cite dans une reponse sont deux metiers differents ; celui-ci est le
 * second.
 *
 * Protocole JSON-RPC 2.0 sur stdio, implemente a la main. Aucune dependance :
 * un serveur de 300 lignes qui tire 40 Mo de node_modules serait un mauvais
 * echange, et ce fichier doit rester lisible par la personne qui le reprendra.
 *
 * Usage :
 *   node mcp/server.mjs
 * Declaration cote client (Claude Desktop, Claude Code) :
 *   { "mcpServers": { "ufc-fr": { "command": "node", "args": ["<chemin>/mcp/server.mjs"] } } }
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://ufc.fr";

const lire = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const posts = lire("data/wp/posts.json");
const pages = lire("data/wp/pages.json");
const categories = lire("data/wp/categories.json");
const carte = existsSync(join(ROOT, "data/carte-ufc-paris-2026.json"))
  ? lire("data/carte-ufc-paris-2026.json")
  : null;

const catById = new Map(categories.map((c) => [c.id, c]));
const texte = (h) =>
  String(h || "").replace(/<[^>]*>/g, " ").replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8211;/g, "–").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();

/** Fiche courte : ce qu'on renvoie dans une liste de resultats. */
const fiche = (p) => ({
  titre: texte(p.title.rendered),
  url: `${SITE}/${p.slug}/`,
  slug: p.slug,
  date: p.date.slice(0, 10),
  maj: p.modified.slice(0, 10),
  rubriques: (p.categories || []).map((id) => catById.get(id)?.name).filter(Boolean),
  resume: texte(p.excerpt.rendered).slice(0, 320),
});

/**
 * Recherche. Un score simple et explicable plutot qu'une pertinence opaque :
 * le titre pese plus que le corps, la fraicheur departage a egalite. Sur un
 * corpus de 90 articles, tout le reste serait de la complexite pour rien.
 */
function rechercher(q, limite = 10, rubrique = null) {
  const mots = q.toLowerCase().split(/\s+/).filter((m) => m.length > 2);
  if (!mots.length) return [];
  return posts
    .filter((p) => !rubrique || (p.categories || []).some((id) => catById.get(id)?.slug === rubrique))
    .map((p) => {
      const t = texte(p.title.rendered).toLowerCase();
      const c = texte(p.content.rendered).toLowerCase();
      let score = 0;
      for (const m of mots) {
        if (t.includes(m)) score += 10;
        if (p.slug.includes(m)) score += 6;
        const n = c.split(m).length - 1;
        score += Math.min(n, 8);
      }
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.p.date) - new Date(a.p.date))
    .slice(0, limite)
    .map((x) => fiche(x.p));
}

const OUTILS = [
  {
    name: "rechercher",
    description:
      "Recherche dans les 90 articles d'UFC.FR (actualite MMA France et international, resultats, portraits de combattants, clubs francais, organisations). Renvoie titre, URL, date et resume.",
    inputSchema: {
      type: "object",
      properties: {
        requete: { type: "string", description: "Mots-cles, par exemple « Parnasse Bercy » ou « club MMA Toulouse »." },
        rubrique: { type: "string", description: "Filtre facultatif : ufc, ares, pfl, one-championship, ksw, cage-warriors, hexagone-mma, clubs-mma-francais, resultats, analyses, combattants, evenements, interviews, actualite, ufc-paris-2026." },
        limite: { type: "number", description: "Nombre de resultats, 10 par defaut." },
      },
      required: ["requete"],
    },
  },
  {
    name: "lire_article",
    description: "Renvoie le texte integral d'un article d'UFC.FR a partir de son slug (obtenu via rechercher).",
    inputSchema: {
      type: "object",
      properties: { slug: { type: "string", description: "Identifiant d'URL, ex. « ufc-paris-2026-date-lieu-carte-enjeux »." } },
      required: ["slug"],
    },
  },
  {
    name: "carte_de_combats",
    description:
      "La carte complete d'UFC Paris 2026 (Accor Arena, 5 septembre 2026) : les 14 combats, divisions, nationalites, et l'etat de la soiree (avant / live / termine) avec les resultats deja saisis.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "rubriques",
    description: "Liste les rubriques du site avec le nombre d'articles de chacune. Utile pour cadrer une recherche.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "pages_de_reference",
    description:
      "Les pages de fond tenues a jour : champions actuels de chaque organisation, classements UFC, calendrier MMA France, les sept fiches organisation, clubs francais, mentions legales.",
    inputSchema: { type: "object", properties: {} },
  },
];

function appeler(nom, args = {}) {
  switch (nom) {
    case "rechercher": {
      const r = rechercher(args.requete || "", args.limite || 10, args.rubrique || null);
      return r.length
        ? { resultats: r.length, articles: r }
        : { resultats: 0, message: "Aucun article. Elargir la requete ou retirer le filtre de rubrique." };
    }
    case "lire_article": {
      const p = posts.find((x) => x.slug === args.slug) || pages.find((x) => x.slug === args.slug);
      if (!p) return { erreur: `Slug inconnu : ${args.slug}` };
      return {
        ...fiche(p),
        source: "UFC.FR — media MMA independant, non affilie a l'Ultimate Fighting Championship",
        texte: texte(p.content.rendered),
      };
    }
    case "carte_de_combats":
      if (!carte) return { erreur: "Carte indisponible." };
      return {
        evenement: carte.nom,
        date: carte.date,
        lieu: `${carte.lieu.nom}, ${carte.lieu.ville}`,
        etat: carte.etat,
        url: `${SITE}/carte/${carte.slug}/`,
        combats: carte.combats.map((c, i) => ({
          ordre: i + 1,
          carte: c.carte,
          division: c.division,
          affiche: `${c.a.nom} vs ${c.b.nom}`,
          nationalites: [c.a.pays, c.b.pays],
          main_event: !!c.titre,
          resultat: c.resultat || (carte.etat === "termine" ? "non saisi" : "a venir"),
          ...(c.reserve ? { reserve: c.reserve } : {}),
        })),
      };
    case "rubriques":
      return {
        rubriques: categories
          .filter((c) => c.count > 0)
          .sort((a, b) => b.count - a.count)
          .map((c) => ({ nom: c.name, slug: c.slug, articles: c.count, url: `${SITE}/categorie/${c.slug}/` })),
      };
    case "pages_de_reference":
      return {
        pages: pages
          .filter((p) => p.slug !== "ufc-fr-mma")
          .map((p) => ({ titre: texte(p.title.rendered), url: `${SITE}/${p.slug}/`, maj: p.modified.slice(0, 10) })),
      };
    default:
      return { erreur: `Outil inconnu : ${nom}` };
  }
}

/* ------------------------------------------------------------- transport */

// Le client peut raccrocher au milieu d'une reponse (fermeture d'onglet,
// arret du process hote). Sans ce garde-fou, l'ecriture leve EPIPE et le
// serveur meurt en emportant la session ; ici il se retire proprement.
process.stdout.on("error", (err) => { if (err.code === "EPIPE") process.exit(0); });

function envoyer(charge) {
  try { process.stdout.write(JSON.stringify(charge) + "\n"); }
  catch (err) { if (err.code !== "EPIPE") throw err; }
}
const repondre = (id, result) => envoyer({ jsonrpc: "2.0", id, result });
const erreur = (id, code, message) => envoyer({ jsonrpc: "2.0", id, error: { code, message } });

createInterface({ input: process.stdin }).on("line", (ligne) => {
  if (!ligne.trim()) return;
  let msg;
  try { msg = JSON.parse(ligne); } catch { return; }
  const { id, method, params } = msg;

  // Les notifications (sans id) n'attendent pas de reponse.
  if (id === undefined) return;

  switch (method) {
    case "initialize":
      return repondre(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "ufc-fr", version: "1.0.0" },
      });
    case "tools/list":
      return repondre(id, { tools: OUTILS });
    case "tools/call": {
      const sortie = appeler(params?.name, params?.arguments || {});
      return repondre(id, {
        content: [{ type: "text", text: JSON.stringify(sortie, null, 1) }],
        isError: !!sortie.erreur,
      });
    }
    case "ping":
      return repondre(id, {});
    default:
      return erreur(id, -32601, `Methode non geree : ${method}`);
  }
});
