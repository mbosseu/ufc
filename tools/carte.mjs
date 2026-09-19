/**
 * La carte de combats — le mécanisme propre à ce site.
 *
 * L'idée, en une phrase technique : la carte n'est pas un tableau, c'est
 * l'instrument de défilement de la page, et cette page vit sur une URL
 * unique dont l'état change.
 *
 * Deux conséquences, et ce sont elles qui justifient le travail :
 *
 * 1. Éditorialement — un tableau de quatorze lignes traite le combat
 *    d'ouverture et le main event à égalité. En faisant de chaque combat une
 *    station de défilement, on rend la soirée dans son ordre réel : on
 *    descend la carte comme elle se déroule, et l'octogone se referme au fur
 *    et à mesure.
 *
 * 2. En référencement — l'usage du secteur est de publier trois pages
 *    (avant-combat, live, résultats) qui se disputent la même requête. Ici
 *    un seul champ `etat` dans le JSON fait passer la page d'un état à
 *    l'autre. L'autorité accumulée pendant la semaine d'avant-combat est
 *    donc exactement celle qui porte le résultat samedi soir, sur la même
 *    adresse, avec le balisage qui se met à jour en même temps.
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT, SITE, esc } from "./build.mjs";
import { head, header, footer } from "./render.mjs";

const carte = JSON.parse(readFileSync(join(ROOT, "data", "carte-ufc-paris-2026.json"), "utf8"));

const ETATS = {
  avant: { kicker: "Avant le gong", verbe: "Ce qui se joue", statut: "https://schema.org/EventScheduled" },
  live: { kicker: "En direct", verbe: "En cours", statut: "https://schema.org/EventScheduled" },
  termine: { kicker: "Résultats", verbe: "Ce qui s’est passé", statut: "https://schema.org/EventCompleted" },
};
const etat = ETATS[carte.etat] || ETATS.avant;

/** Un combat = une station. L'indice sert au repère chiffré, pas au style. */
function station(c, i, total) {
  const fr = (p) => p.pays === "France";
  const drapeau = fr(c.a) || fr(c.b) ? ' data-fr="1"' : "";
  return `      <article class="bout${c.titre ? " is-main" : ""}"${drapeau} data-bout="${i + 1}" id="combat-${i + 1}">
        <div class="bout-rank"><span>${String(i + 1).padStart(2, "0")}</span><i>/${total}</i></div>
        <div class="bout-grid">
          <div class="bout-side a">
            <h3>${esc(c.a.nom)}</h3>
            <p class="bout-meta">${esc(c.a.pays)}${c.a.note ? ` · ${esc(c.a.note)}` : ""}</p>
          </div>
          <div class="bout-mid">
            <span class="bout-vs">contre</span>
            <span class="bout-div">${esc(c.division)}</span>
            ${c.titre ? '<span class="bout-tag">Main event</span>' : ""}
          </div>
          <div class="bout-side b">
            <h3>${esc(c.b.nom)}</h3>
            <p class="bout-meta">${esc(c.b.pays)}${c.b.note ? ` · ${esc(c.b.note)}` : ""}</p>
          </div>
        </div>
        <p class="bout-state">${
          c.resultat
            ? esc(c.resultat)
            : carte.etat === "termine"
            ? "Résultat non saisi"
            : "À venir"
        }</p>
${
  c.reserve
    ? `        <p class="bout-reserve">${esc(c.reserve)}${
        c.reserve_source ? ` <a href="${c.reserve_source}">Lire le détail</a>` : ""
      }</p>`
    : ""
}
      </article>`;
}

const principale = carte.combats.filter((c) => c.carte === "principale");
const prelims = carte.combats.filter((c) => c.carte === "preliminaire");

// Le balisage suit l'état : chaque combat est un sous-événement nommé, ce
// qui permet à un moteur de réponse de citer un résultat précis plutôt que
// « la page des résultats ».
const schema = {
  "@context": "https://schema.org",
  "@type": "SportsEvent",
  name: carte.nom,
  startDate: carte.debut,
  eventStatus: etat.statut,
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  sport: "Mixed Martial Arts",
  url: `${SITE}/carte/${carte.slug}/`,
  location: {
    "@type": "Place",
    name: carte.lieu.nom,
    address: { "@type": "PostalAddress", addressLocality: carte.lieu.ville, addressCountry: carte.lieu.pays },
  },
  organizer: { "@type": "Organization", name: "Ultimate Fighting Championship" },
  subEvent: carte.combats.map((c, i) => ({
    "@type": "SportsEvent",
    name: `${c.a.nom} vs ${c.b.nom}`,
    sport: "Mixed Martial Arts",
    startDate: c.carte === "principale" ? carte.debut : carte.prelims,
    url: `${SITE}/carte/${carte.slug}/#combat-${i + 1}`,
    competitor: [
      { "@type": "Person", name: c.a.nom },
      { "@type": "Person", name: c.b.nom },
    ],
    ...(c.resultat ? { description: c.resultat } : {}),
  })),
};

const desc =
  carte.etat === "termine"
    ? `Résultats complets d’UFC Paris 2026 à l’Accor Arena, combat par combat : ${carte.combats.length} combats, dont Hooker vs Parnasse.`
    : `La carte complète d’UFC Paris 2026 à l’Accor Arena, combat par combat : ${carte.combats.length} combats, ${
        carte.combats.filter((c) => c.a.pays === "France" || c.b.pays === "France").length
      } avec un Français. Mise à jour en direct le 5 septembre.`;

const html = `${head({
  title: `UFC Paris 2026 : la carte complète, combat par combat | UFC.FR`,
  description: desc,
  canonical: `/carte/${carte.slug}/`,
  image: "/media/brand/ufc-fr-og.jpg",
  type: "article",
  schema: [schema],
})}
${header("", "home")}
  <main id="contenu" class="card-page" data-etat="${carte.etat}">

    <header class="card-hero">
      <div class="wrap">
        <p class="crumbs"><a href="/">Accueil</a> · <a href="/ufc-paris-2026-date-lieu-carte-enjeux/">UFC Paris 2026</a> · La carte</p>
        <span class="kicker">${etat.kicker}</span>
        <h1>UFC Paris 2026,<br />combat par combat</h1>
        <p class="lede">${
          carte.etat === "termine"
            ? "Accor Arena · samedi 5 septembre 2026 · soirée terminée. Résultats saisis combat par combat — l’adresse n’a pas changé."
            : "Accor Arena · samedi 5 septembre · préliminaires 18h, carte principale 21h. Cette page se met à jour pendant la soirée — l’adresse ne change pas."
        }</p>
        <p class="card-count"><b>${carte.combats.length}</b> combats · <b>${
          carte.combats.filter((c) => c.a.pays === "France" || c.b.pays === "France").length
        }</b> avec un Français</p>
      </div>
      <p class="card-scrollhint" aria-hidden="true">Descendre la carte</p>
    </header>

    <div class="carte-corps">
      <!-- L'octogone reste à l'écran et se referme au fil de la descente :
           c'est lui qui dit où on en est dans la soirée. -->
      <div class="cage" aria-hidden="true">
        <svg viewBox="0 0 200 200" role="presentation">
          <polygon class="cage-bg" points="59,4 141,4 196,59 196,141 141,196 59,196 4,141 4,59" />
          <polygon class="cage-line" points="59,4 141,4 196,59 196,141 141,196 59,196 4,141 4,59" pathLength="1" />
        </svg>
        <span class="cage-count"><b data-cage-now>01</b><i>/${carte.combats.length}</i></span>
      </div>

      <div class="card-rail">
        <h2 class="card-part"><span>Carte principale</span><i>21h00</i></h2>
${principale.map((c, i) => station(c, i, carte.combats.length)).join("\n")}
        <h2 class="card-part"><span>Préliminaires</span><i>18h00</i></h2>
${prelims.map((c, i) => station(c, i + principale.length, carte.combats.length)).join("\n")}
      </div>
    </div>

    <section class="block card-outro">
      <div class="wrap" data-reveal>
        <span class="kicker">Autour de la carte</span>
        <h2>Le dossier Bercy</h2>
        <ul class="related-list">
          <li><a href="/ufc-paris-2026-date-lieu-carte-enjeux/">Date, lieu, contexte : tout le dossier</a></li>
          <li><a href="/ufc-paris-2026-combattants-francais/">Les Français sur la carte</a></li>
          <li><a href="/salahdine-parnasse-citations-ufc-paris/">Parnasse en citations</a></li>
          <li><a href="/dan-hooker-citations-ufc-paris-parnasse/">Hooker en citations</a></li>
          <li><a href="/ufc-paris-2026-resultats-complets/">Tous les résultats, en un article</a></li>
          <li><a href="/ufc-paris-2026-bilan-francais-resultats/">Bilan des Français (5/9)</a></li>
          <li><a href="/classements-ufc-aout-2026/">Ce que la soirée change aux classements</a></li>
        </ul>
        <p class="card-honest">${
          carte.etat === "termine"
            ? "Résultats consolidés d’après ActuMMA (8 septembre 2026). UFC.FR n’était pas dans la salle ; aucun score n’est inventé."
            : "Aucun vainqueur, score ni méthode n’est anticipé sur cette page. Les résultats sont saisis par la rédaction après chaque combat."
        }</p>
      </div>
    </section>

  </main>
${footer().replace("</body>", '  <script src="/js/carte.js" defer></script>\n</body>')}`;

mkdirSync(join(ROOT, "carte", carte.slug), { recursive: true });
writeFileSync(join(ROOT, "carte", carte.slug, "index.html"), html, "utf8");
console.log(`[carte] /carte/${carte.slug}/ — ${carte.combats.length} combats, état « ${carte.etat} »`);
