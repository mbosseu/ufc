/**
 * L'accueil, pilotée par le corpus.
 *
 * Le parti pris éditorial, et c'est le seul qui compte ici : une page
 * d'accueil de média n'est pas une grille. Une grille dit que tous les
 * sujets se valent, et le samedi 5 septembre à Bercy ne vaut pas la même
 * chose qu'un portrait de plus. La page est donc construite en paliers —
 * un événement qui occupe l'écran, un fil qui respire, des rubriques qui
 * ferment — au lieu d'un empilement de cartes identiques.
 *
 * Tous les liens pointent les slugs canoniques du corpus, jamais les
 * anciennes pages écrites à la main : c'est ce qui met fin à la
 * cannibalisation entre les deux versions d'un même sujet.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { posts, categories, ROOT, SITE, esc, decode, stripTags, dateFr, localMedia, resume, imageMaison, vignette } from "./build.mjs";
import { head, header, footer } from "./render.mjs";
import { annuaire, fiche } from "./salles.mjs";

const catBySlug = new Map(categories.map((c) => [c.slug, c]));
const byDate = [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
const inCat = (slug) => {
  const c = catBySlug.get(slug);
  return c ? byDate.filter((p) => (p.categories || []).includes(c.id)) : [];
};
const bySlug = (s) => posts.find((p) => p.slug === s);

function media(p) {
  const fm = p?._embedded?.["wp:featuredmedia"]?.[0];
  // Articles maison : la photo du JSON prime sur le repli par nom dans le slug.
  if (p?.maison && fm?.source_url) {
    const l = localMedia(fm.source_url);
    return { url: l ? l.url : fm.source_url, alt: fm.alt_text || decode(p.title.rendered) };
  }
  const maison = imageMaison(p?.slug);
  if (maison) return { url: maison.url, alt: decode(p.title.rendered) };
  if (!fm?.source_url) return null;
  const l = localMedia(fm.source_url);
  return { url: l ? l.url : fm.source_url, alt: fm.alt_text || "", w: fm.media_details?.width, h: fm.media_details?.height };
}
const T = (p) => esc(decode(p.title.rendered));
const X = (p, n = 130) => esc(resume(p, n));

// Les images deja posees sur la page. L'accueil n'avait pas de
// dedoublonnage — seules les listes en avaient — et le heros, une carte et le
// roster pouvaient montrer trois fois le meme homme.
const vues = new Set();

function pic(p, cls = "", unique = true) {
  const m = media(p);
  if (!m) return "";
  if (unique) {
    if (vues.has(m.url)) return "";
    vues.add(m.url);
  }
  return `<img src="${vignette(m.url)}" alt="${esc(m.alt)}"${m.w && m.h ? ` width="${m.w}" height="${m.h}"` : ""} loading="lazy" decoding="async"${cls ? ` class="${cls}"` : ""} />`;
}

// Le heros et la section « salles » posent leurs images en dur : on les
// reserve avant que le fil se serve, sinon les deux fiches Boxing Center
// reviennent en carte avec la meme photo quelques centaines de pixels plus
// haut.
vues.add("/img/gym.webp");
vues.add("/media/clubs/boxing-center-etats-unis.webp");
vues.add("/media/clubs/boxing-center-ramonville.webp");
// gane.webp n'est PAS reserve ici : il sert a la une et aux vignettes
// d'actu. Le reserver vidait les cartes aside (pic() renvoyait "").

const paris = inCat("ufc-paris-2026");
const clubsCat = inCat("clubs-mma-francais");
const clubSlugs = new Set(clubsCat.map((p) => p.slug));
const portraits = byDate.filter((p) => p.slug.startsWith("portrait-"));
// À la une = actu fraîche. On écarte les clubs (palier salles) et les
// pages promo pré-Paris qui ne doivent plus ouvrir le fil.
const EXCLUS_UNE = new Set([
  "dan-hooker-citations-ufc-paris-parnasse",
  "morgan-charriere-citations-ufc-paris",
  "ziam-sola-citations-ufc-paris",
  "salahdine-parnasse-citations-ufc-paris",
  "ciryl-gane-retour-entrainement-aspinall",
  "ufc-paris-santos-forfait-wood",
  "ufc-paris-2027",
]);
const une =
  bySlug("ciryl-gane-champion-inconteste-ufc-hokit") ||
  bySlug("ufc-334-gane-hokit-ce-quil-faut-savoir") ||
  bySlug("ufc-paris-2026-resultats-complets") ||
  paris[0];
const fil = byDate
  .filter(
    (p) =>
      !p.slug.startsWith("portrait-") &&
      !clubSlugs.has(p.slug) &&
      !EXCLUS_UNE.has(p.slug) &&
      p.slug !== une?.slug
  )
  .slice(0, 7);

const schema = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "UFC.FR",
    alternateName: "UFC.FR — média MMA indépendant",
    url: SITE + "/",
    inLanguage: "fr-FR",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: SITE + "/recherche/?q={search_term_string}" },
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "NewsMediaOrganization",
    name: "UFC.FR",
    url: SITE + "/",
    logo: { "@type": "ImageObject", url: SITE + "/logo/ufc.fr.jpeg" },
    description: "Média indépendant d’actualité MMA en France et à l’international. Non affilié à l’Ultimate Fighting Championship.",
    diversityPolicy: SITE + "/a-propos/",
    ethicsPolicy: SITE + "/a-propos/",
  },
  {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: "UFC 334 — Gane vs Hokit",
    startDate: "2026-11-14T22:00:00-05:00",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: "Madison Square Garden",
      address: { "@type": "PostalAddress", addressLocality: "New York", addressCountry: "US" },
    },
    sport: "Mixed Martial Arts",
    url: SITE + "/ufc-334-gane-hokit-ce-quil-faut-savoir/",
  },
];

const EVENEMENT = "2026-11-14T22:00:00-05:00";
function compteARebours() {
  const reste = new Date(EVENEMENT).getTime() - Date.now();
  if (reste <= 0) return "En cours";
  const h = Math.floor(reste / 36e5);
  if (h >= 48) return "J\u2212" + Math.floor(h / 24);
  return h + "h" + String(Math.floor((reste % 36e5) / 6e4)).padStart(2, "0");
}

const html = `${head({
  title: "UFC.FR — l’actualité du MMA, en français",
  /* 174 signes : Google en affiche environ 160, et c'est la mise en garde
     « pas le site officiel » qui sautait — celle qui evite justement la
     deception au clic. Elle passe donc avant ce qui peut sauter. */
  description:
    "Média MMA indépendant, pas le site officiel de l’UFC. Ciryl Gane champion, résultats, champions de toutes les organisations et clubs français.",
  canonical: "/",
  image: "/media/brand/ufc-fr-og.jpg",
  type: "website",
  schema,
})}
${header("/", "home")}
  <main id="contenu">

  <!-- Palier 1 — un seul portrait, bien cadre : on n'a pas de photo de
       Hokit, donc pas de faux duel. Gane occupe l'ecran en champion. -->
  <section class="hero hero-cage hero-solo">

    <figure class="hero-solo-fig">
      <img src="/img/gane.webp" alt="Ciryl Gane, champion incontesté UFC des poids lourds" width="1290" height="1814" fetchpriority="high" />
      <figcaption>
        <span class="kicker">France · Champion incontesté UFC</span>
        <span class="hero-name">Ciryl Gane</span>
        <span class="hero-sub">UFC 334 · vs Josh Hokit · 14 novembre · MSG</span>
      </figcaption>
    </figure>

    <div class="hero-foot">
      <p class="hero-when">
        <time datetime="2026-11-14">14 novembre · Madison Square Garden</time>
        <b data-countdown="${EVENEMENT}">${compteARebours()}</b>
      </p>
      <div class="hero-actions">
        <a class="btn btn-fill cut" href="/${une.slug}/">Gane champion incontesté</a>
        <a class="btn btn-line cut" href="/ufc-334-gane-hokit-ce-quil-faut-savoir/">UFC 334 : le dossier</a>
      </div>
    </div>
  </section>

  <div class="ticker">
    <div class="pulse"><b></b></div>
    <div class="ticker-rail">
      <div class="ticker-run">
${[
  ["Gane champion", "Premier Français incontesté à l’UFC"],
  ["UFC 334", "Gane vs Hokit · 14 nov. · MSG"],
  ["Hexagone Rouen", "Baybatyrov KO en 44 secondes"],
  ["UFC Paris", "Parnasse KO Hooker · résultats"],
  ["Champions", "Ceintures mises à jour"],
  [`${posts.length} articles`, "Toutes organisations, en français"],
]
  .concat([
    ["Gane champion", "Premier Français incontesté à l’UFC"],
    ["UFC 334", "Gane vs Hokit · 14 nov. · MSG"],
    ["Hexagone Rouen", "Baybatyrov KO en 44 secondes"],
    ["UFC Paris", "Parnasse KO Hooker · résultats"],
    ["Champions", "Ceintures mises à jour"],
    [`${posts.length} articles`, "Toutes organisations, en français"],
  ])
  .map(([t, d], i) => `        <span class="tick"${i >= 6 ? ' aria-hidden="true"' : ""}><strong>${esc(t)}</strong><span>${esc(d)}</span></span>`)
  .join("\n")}
      </div>
    </div>
  </div>

  <section class="block ed-week">
    <div class="wrap ed-head" data-reveal>
      <span class="kicker">À la une</span>
      <h1>L’actualité du MMA, en français</h1>
      <p class="lede">Gane est champion. Hexagone a frappé à Rouen. La suite, ici.</p>
      <a class="more" href="/actualite-du-mma/">Tout le fil (${posts.length})</a>
    </div>
    <a class="ed-lead" href="/${une.slug}/" data-reveal data-reveal-media>
      <div class="ed-lead-media" data-profondeur><img src="/img/gane.webp" alt="Ciryl Gane, champion incontesté UFC des poids lourds" width="1290" height="1814" loading="lazy" decoding="async" style="object-position:50% 18%" /></div>
      <div class="ed-lead-copy">
        <span class="kicker">Actualité</span>
        <h2>${T(une)}</h2>
        <p>${X(une, 150)}</p>
      </div>
    </a>
    <div class="wrap ed-aside">
${fil
  .slice(0, 2)
  .map(
    (p) => `      <a class="ed-aside-item" href="/${p.slug}/" data-reveal>
        ${pic(p)}
        <div>
          <span class="kicker">${esc(
            // La rubrique la plus precise, pas la premiere : « Actualite »
            // contient presque tout et ne distingue rien.
            categories
              .filter((c) => (p.categories || []).includes(c.id))
              .sort((a, b) => (a.slug === "actualite") - (b.slug === "actualite"))[0]?.name || "Actualité"
          )}</span>
          <h3>${T(p)}</h3>
          <p>${X(p, 90)}</p>
        </div>
      </a>`
  )
  .join("\n")}
    </div>
    <div class="wrap">
      <!-- Les chiffres du corpus. Ce site n'a pas d'exclusivite a vendre : son
           argument est le volume et la tenue. Autant le dire avec les nombres,
           qui montent quand on arrive dessus. -->
      <div class="chiffres" data-reveal>
        <p class="compteur"><b data-compte="${posts.length}">0</b><span>articles</span></p>
        <p class="compteur"><b data-compte="${portraits.length}">0</b><span>portraits</span></p>
        <p class="compteur"><b data-compte="${annuaire().length}">0</b><span>clubs français</span></p>
        <p class="compteur"><b data-compte="7">0</b><span>organisations</span></p>
      </div>
      <div class="split-list home-list">
${fil
  .slice(2)
  .map(
    (p, i) => `        <a class="row" href="/${p.slug}/" data-reveal>
          <span class="pos">${String(i + 1).padStart(2, "0")}</span>
          <span class="nm">${T(p)}</span>
          <span class="rec">${dateFr(p.date).replace(/ 2026$/, "")}</span>
        </a>`
  )
  .join("\n")}
      </div>
    </div>
  </section>

  <!-- Palier 3 — les combattants. Le corpus le plus dense du site : il
       mérite sa propre respiration, pas une ligne dans un menu. -->
  <section class="block ed-roster-block">
    <div class="wrap ed-head" data-reveal>
      <span class="kicker">Les combattants</span>
      <h2>${portraits.length} portraits, sept organisations</h2>
      <p class="lede">De l’UFC au KSW. Parcours, records, style — sans classement maison.</p>
      <a class="more" href="/mma-portraits-de-champions/">Tous les portraits</a>
    </div>
    <div class="wrap">
      <div class="roster">
${portraits
  .slice(0, 12)
  .map(
    // Le systeme de design attend `.roster a > .meta > h3`. Un <span> nu passe
    // sous l'image, qui est en position absolue : le nom etait rendu, et
    // invisible. On emet le balisage que la feuille de style connait.
    (p) => `        <a href="/${p.slug}/" data-reveal>${pic(p)}<div class="meta"><h3>${esc(
      decode(p.title.rendered).replace(/^Portrait\s*[:–-]\s*/i, "").split(/[,–]/)[0]
    )}</h3></div></a>`
  )
  .join("\n")}
      </div>
    </div>
  </section>

  <!-- Palier 4 — les salles.
       Exigence du cahier des charges §9, et la seule rubrique ou le site parle
       de lieux ou l'on peut aller. Elle passe sur fond sombre : dans une page
       claire, c'est ce qui lui donne le poids d'une destination plutot que
       d'une liste.

       Chaque salle porte deux liens : le reportage chez nous, et le site du
       club. Le second est place comme une recommandation editoriale — c'est
       la forme que le cahier des charges §10 a validee pour Cage Fight, et
       c'est celle qui a du sens : on envoie le lecteur verifier les horaires
       la ou ils sont a jour. -->
  <section class="salles">
    <div class="wrap">
      <header class="salles-tete" data-reveal>
        <div>
          <span class="kicker">Les salles</span>
          <h2>Découvre les salles du mois.</h2>
        </div>
        <a class="more" href="/clubs-mma-francais/">Toute la rubrique</a>
      </header>

      <div class="salles-grille">
${/* Les trois salles de tete viennent de l'annuaire, pas d'une liste ecrite
     ici : la page d'accueil et la page rubrique montraient sinon deux
     versions du meme club, et l'une des deux finissait par etre fausse.
     Une salle publiee demain remonte ici sans qu'on touche a ce fichier. */
  annuaire().slice(0, 3).map((s) => fiche(s, { anime: true })).join("\n")}
      </div>
    </div>
  </section>

  <!-- Palier 5 — les repères. Ce qui fait qu'on revient : les pages qui ne
       périment pas. -->
  <section class="block ed-keys">
    <div class="wrap ed-keys-grid">
      <div data-reveal>
        <span class="kicker">Repères</span>
        <h2>Pour s’y retrouver</h2>
        <ul class="ed-keys-list">
          <li><a href="/champions-mma-actuels/"><em>01</em><span><strong>Les champions, là, maintenant</strong><b>UFC, PFL, ONE, KSW, ARES, Hexagone. Daté.</b></span></a></li>
          <li><a href="/classements-ufc-aout-2026/"><em>02</em><span><strong>Les classements UFC</strong><b>Divisions par divisions, mis à jour.</b></span></a></li>
          <li><a href="/calendrier-mma-france-automne-2026/"><em>03</em><span><strong>Le calendrier français</strong><b>Hexagone, ARES, FMMAF. Ce qui arrive.</b></span></a></li>
          <li><a href="/organisation-mma-ultimate-fighting-championship/"><em>04</em><span><strong>Les organisations</strong><b>Qui organise quoi, et pour qui.</b></span></a></li>
        </ul>
      </div>
      <div class="ed-keys-photo" data-reveal data-reveal-media>
        <img src="/img/ceinture.webp" alt="Ceinture de champion MMA" width="1200" height="800" loading="lazy" decoding="async" />
      </div>
    </div>
  </section>

  </main>
${footer()}`;

writeFileSync(join(ROOT, "index.html"), html, "utf8");
console.log("[accueil] index.html régénéré depuis le corpus");
console.log(`  une: ${une.slug}`);
console.log(`  fil: ${fil.length} · portraits: ${portraits.length} · clubs: ${clubsCat.length}`);
