/**
 * Émission des pages. Un document extrait → un dossier /slug/index.html.
 *
 * Le choix du dossier plutôt que slug.html n'est pas cosmétique : c'est ce qui
 * reproduit exactement l'URL déjà indexée par Google sur le WordPress. Le jour
 * de la bascule, aucune redirection n'est nécessaire et aucune position n'est
 * perdue.
 */
import { writeFileSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import {
  posts, pages, categories, ROOT, SITE, mediaManifest,
  cleanContent, esc, decode, stripTags, dateFr, metaDesc, seoTitle, localMedia, imageMaison, resume, intrusDuCorpus, vignette,
} from "./build.mjs";
import { head, header, footer, ORGS } from "./render.mjs";
import { annuaire, fiche } from "./salles.mjs";

const written = [];

function emit(slugPath, html) {
  const dir = join(ROOT, slugPath);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html, "utf8");
  written.push("/" + slugPath.replace(/\\/g, "/") + "/");
}

/* ----------------------------------------------------------------- médias --
 * On recopie les binaires en conservant l'arborescence /YYYY/MM/ de WordPress.
 * Garder cette structure évite les collisions de noms entre deux années et
 * correspond aux chemins déjà présents dans le corps des articles.
 */
function copyMedia() {
  let n = 0;
  for (const m of mediaManifest) {
    const src = join(ROOT, m.local);
    if (!existsSync(src)) continue;
    const rel = new URL(m.source_url).pathname.replace(/^\/wp-content\/uploads\//, "");
    const dest = join(ROOT, "media", rel);
    mkdirSync(dirname(dest), { recursive: true });
    if (!existsSync(dest)) copyFileSync(src, dest);
    n++;
  }
  return n;
}

/* ---------------------------------------------------------------- schémas --
 * Ce que les robots — Google et les moteurs de réponse — peuvent citer. Le
 * WordPress émettait déjà Organization + WebSite + BreadcrumbList ; on ne
 * descend pas en dessous, et on ajoute NewsArticle, absent de l'ancien site.
 */
const publisher = {
  "@type": "NewsMediaOrganization",
  name: "UFC.FR",
  url: SITE + "/",
  logo: { "@type": "ImageObject", url: SITE + "/logo/ufc.fr.jpeg" },
  description:
    "Média indépendant d’actualité MMA en France et à l’international. Non affilié à l’Ultimate Fighting Championship.",
};

function breadcrumb(trail) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map(([name, url], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: SITE + url,
    })),
  };
}

function newsArticle(doc, url, image) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: decode(doc.title.rendered).slice(0, 110),
    description: metaDesc(doc),
    datePublished: doc.date_gmt + "Z",
    dateModified: doc.modified_gmt + "Z",
    author: { "@type": "Organization", name: "Rédaction UFC.FR", url: SITE + "/a-propos/" },
    publisher,
    mainEntityOfPage: { "@type": "WebPage", "@id": SITE + url },
    ...(image ? { image: [SITE + image] } : {}),
    inLanguage: "fr-FR",
    isAccessibleForFree: true,
  };
}

/* ------------------------------------------------------------------ rendu */

const catById = new Map(categories.map((c) => [c.id, c]));

/**
 * Le visage d'un document.
 *
 * Un media se reconnait a ce que ses formats ont des visages differents. Un
 * portrait de combattant, un resultat de gala et un reportage de salle ne se
 * lisent pas de la meme facon : le portrait est une personne, le resultat est
 * une chronologie, le reportage est un lieu. Servir les trois dans le meme
 * gabarit, c'est le defaut qui fait dire « site genere ».
 *
 * La detection s'appuie sur le slug puis sur la rubrique — dans cet ordre,
 * parce qu'un portrait range par erreur dans « actualite » reste un portrait.
 */
function faceOf(doc, cats) {
  const slug = doc.slug;
  const slugs = cats.map((c) => c.slug);
  if (slug.startsWith("portrait-")) return "portrait";
  if (slugs.includes("clubs-mma-francais") || /club|gym|academy|team-/.test(slug)) return "lieu";
  if (slugs.includes("resultats") || /resultat|-\d{3}-|vs-/.test(slug)) return "resultat";
  if (/citations/.test(slug)) return "citations";
  return "recit";
}

/** L'organisation d'un portrait, tiree de son slug : portrait-ufc-x → UFC. */
const ORG_LABEL = {
  ufc: "UFC", pfl: "PFL", ksw: "KSW", ares: "ARES",
  one: "ONE Championship", "one-championship": "ONE Championship",
  "cage-warriors": "Cage Warriors", "cage-wrarriors": "Cage Warriors",
  "hexagone-mma": "Hexagone MMA",
};
function orgOf(slug) {
  const m = slug.match(/^portrait-(one-championship|cage-wrarriors|cage-warriors|hexagone-mma|ufc|pfl|ksw|ares|one)-/);
  return m ? ORG_LABEL[m[1]] : null;
}

/** Quelle rubrique alimente la grille de chaque page organisation. */
const ORG_CATEGORY = {
  "organisation-mma-ultimate-fighting-championship": "ufc",
  "organisation-mma-professional-fighters-league": "pfl",
  "organisation-mma-one-championship": "one-championship",
  "organisation-mma-cage-warriors": "cage-warriors",
  "organisation-mma-ares-fighting-championship": "ares",
  "organisation-hexagone-mma": "hexagone-mma",
  "organisation-mma-ksw": "ksw",
};

/**
 * L'ouverture d'une page organisation.
 *
 * Les sept pages partageaient un montage de banque d'images ou les sept
 * logotypes etaient colles cote a cote : sur la page KSW, le lecteur voyait
 * d'abord les logos de l'UFC, de ONE et de la PFL. Une image qui met en
 * avant les concurrents du sujet ne l'illustre pas, elle le noie.
 *
 * On n'a pas de photographie propre a chaque organisation, et les visuels
 * d'evenement ne se reprennent pas comme la photo qu'un club publie de sa
 * salle. Alors on ne fait pas semblant : l'ouverture devient typographique.
 * Le sigle est ce que le lecteur reconnait, et les trois reperes en dessous
 * sont ce que le site sait reellement — pays, annee, et ce qu'on en publie.
 */
const ORG_FICHE = {
  "organisation-mma-ultimate-fighting-championship": { sigle: "UFC", pays: "États-Unis", depuis: "1993" },
  "organisation-mma-professional-fighters-league": { sigle: "PFL", pays: "États-Unis", depuis: "2018" },
  "organisation-mma-one-championship": { sigle: "ONE", pays: "Singapour", depuis: "2011" },
  "organisation-mma-cage-warriors": { sigle: "CW", pays: "Royaume-Uni", depuis: "2001" },
  "organisation-mma-ares-fighting-championship": { sigle: "ARES", pays: "France", depuis: "2019" },
  "organisation-hexagone-mma": { sigle: "HEXAGONE", pays: "France", depuis: "2020" },
  "organisation-mma-ksw": { sigle: "KSW", pays: "Pologne", depuis: "2004" },
};

function ouvertureOrg(doc) {
  const f = ORG_FICHE[doc.slug];
  if (!f) return "";
  /* Une page n'a pas de rubrique — seuls les articles en ont. Compter les
   * « articles lies » a la page donnait donc zero sur les sept pages. On
   * compte la rubrique que la page represente. */
  const cat = ORG_CATEGORY[doc.slug];
  const nArticles = posts.filter((p) =>
    (p.categories || []).some((id) => catById.get(id)?.slug === cat)
  ).length;
  return `      <div class="org-ouverture" data-reveal>
        <span class="org-sigle">${esc(f.sigle)}</span>
        <dl class="org-reperes">
          <div><dt>Pays</dt><dd>${esc(f.pays)}</dd></div>
          <div><dt>Depuis</dt><dd>${esc(f.depuis)}</dd></div>
          <div><dt>Chez nous</dt><dd>${nArticles} article${nArticles > 1 ? "s" : ""}</dd></div>
        </dl>
      </div>`;
}

function featuredImage(doc) {
  // Une photo maison, quand le sujet en a une, passe avant l'image du CMS.
  const maison = imageMaison(doc.slug);
  if (maison) return { url: maison.url, alt: decode(doc.title.rendered), credit: maison.credit };
  const fm = doc._embedded?.["wp:featuredmedia"]?.[0];
  if (!fm?.source_url) return null;
  const local = localMedia(fm.source_url);
  return {
    url: local ? local.url : fm.source_url,
    alt: fm.alt_text || stripTags(fm.title?.rendered || ""),
    credit: fm.credit || "",
    width: fm.media_details?.width,
    height: fm.media_details?.height,
  };
}

/** Trois articles proches, choisis par catégorie partagée puis par fraîcheur. */
function related(doc, pool, n = 3) {
  const mine = new Set(doc.categories || []);
  return pool
    .filter((p) => p.id !== doc.id)
    .map((p) => ({ p, score: (p.categories || []).filter((c) => mine.has(c)).length }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.p.date) - new Date(a.p.date))
    .slice(0, n)
    .map((x) => x.p);
}

/* ------------------------------------------------- blocs pleine largeur --
 * Le corps d'un document est rendu dans `.prose`, dont la largeur est bornee
 * a la mesure de lecture. C'est juste pour du texte et faux pour une grille :
 * une galerie de quatorze fiches enfermee dans 720 px se serre dans le tiers
 * gauche de l'ecran. Aucune regle de debordement n'a jamais tenu contre le
 * `max-width` du conteneur — la lecon est deja au registre.
 *
 * On coupe donc le corps a l'endroit du bloc, et on sort de la colonne de
 * lecture pour le rendre. C'est une decision de structure, pas de style.
 */
const MARQUE = "<!--PLEINE-LARGEUR-->";

function tisser(body, blocs) {
  const parts = body.split(MARQUE);
  const out = [`      <div class="prose" data-reveal>\n${parts[0].trim()}\n      </div>`];
  parts.slice(1).forEach((suite, i) => {
    out.push(`    </div>
    <div class="wrap bloc-large">
${blocs[i]}
    </div>
    <div class="wrap-read">`);
    if (suite.trim()) out.push(`      <div class="prose" data-reveal>\n${suite.trim()}\n      </div>`);
  });
  return out.join("\n");
}

/** Une carte d'article — le composant `.card` du systeme, tel quel. */
function carteArticle(p) {
  const t = featuredImage(p);
  // « Actualite » passe en dernier : c'est la rubrique fourre-tout, et une
  // carte qui l'affiche n'apprend rien de plus que le titre.
  const cat = (p.categories || [])
    .map((id) => catById.get(id))
    .filter(Boolean)
    .sort((a, b) => (a.slug === "actualite") - (b.slug === "actualite"))[0];
  return `        <a class="card" href="/${p.slug}/" data-reveal>
          ${t ? `<div class="media" data-reveal-media><img src="${vignette(t.url)}" alt="${esc(t.alt)}" loading="lazy" decoding="async" /></div>` : ""}
          <div class="card-body">
            <span class="kicker">${esc(cat?.name || "Actualité")}</span>
            <h3>${esc(decode(p.title.rendered))}</h3>
            <p>${esc(resume(p, 130))}</p>
            <time datetime="${p.date.slice(0, 10)}">${dateFr(p.date)}</time>
          </div>
        </a>`;
}

/**
 * Ce que la page « Les clubs de MMA français » gagne a ne plus etre du texte.
 *
 * Elle tenait deux listes ecrites a la main : les portraits publies, et un
 * « A lire aussi » qui reprenait les memes noms. Les deux etaient devenues
 * fausses — ni Boxing Center Etats-Unis ni Ramonville n'y figuraient — et
 * aucune ne montrait la moindre salle. On les remplace par ce que le corpus
 * sait deja produire : un annuaire en fiches, puis les articles de la
 * rubrique. Le texte des puces n'est pas perdu, il devient la ligne de
 * chaque fiche.
 */
function blocsClubs(body, doc) {
  const blocs = [];
  const salles = annuaire();

  if (salles.length) {
    body = body.replace(/<h2>Portraits publiés<\/h2>\s*<ul>[\s\S]*?<\/ul>/, MARQUE);
    blocs.push(`      <section class="annuaire" aria-labelledby="annuaire-titre">
        <header class="annuaire-tete" data-reveal>
          <div>
            <span class="kicker">L’annuaire</span>
            <h2 id="annuaire-titre">${salles.length} salles couvertes</h2>
          </div>
          <p class="annuaire-note">Chaque fiche renvoie à notre reportage et au site du club. Planning, tarifs&nbsp;: toujours chez le club, jamais chez nous.</p>
        </header>
        <div class="annuaire-grille">
${salles.map((s) => fiche(s)).join("\n")}
        </div>
      </section>`);
  }

  /* La seconde liste — « À lire aussi » — reprenait sept noms de clubs deja
   * cites vingt lignes plus haut, plus trois textes qui, eux, n'etaient nulle
   * part ailleurs. Reprendre les clubs en cartes ferait voir deux fois la
   * meme photo sur une meme page ; on ne garde donc que ce que l'annuaire ne
   * peut pas porter : la federation, les organisations, les coachs. C'est ce
   * qui entoure un club, et c'est ce qui manquait. */
  const autour = ["fmmaf-federation-mma-france-clubs", "coachs-cage-fight-toulouse-jerome-tancrede-yannis",
    "coach-zouhir-boumenir-boxing-center-toulouse",
    "organisation-hexagone-mma", "organisation-mma-ares-fighting-championship"]
    .map((sl) => posts.find((p) => p.slug === sl) || pages.find((p) => p.slug === sl))
    .filter(Boolean);
  if (autour.length) {
    body = body.replace(/<h2>À lire aussi<\/h2>\s*<ul>[\s\S]*?<\/ul>/, MARQUE);
    blocs.push(`      <section class="rubrique-suite" aria-labelledby="suite-titre">
        <header class="ed-head" data-reveal>
          <span class="kicker">Autour des clubs</span>
          <h2 id="suite-titre">Ce qui encadre la pratique</h2>
          <a class="more" href="/categorie/clubs-mma-francais/">Toute la rubrique</a>
        </header>
        <div class="cards grid-4">
${autour.map(carteArticle).join("\n")}
        </div>
      </section>`);
  }

  return { body, blocs };
}

function renderDocument(doc, { isPage }) {
  const url = `/${doc.slug}/`;
  const title = decode(doc.title.rendered);
  // Le titre SEO passe par le filtre du corpus : un champ Yoast duplique ou
  // sans rapport avec le titre reel est ecarte au profit du vrai titre.
  const seo = seoTitle(doc);
  const img = featuredImage(doc);
  /* « Actualité » est la rubrique fourre-tout : presque tout y est range en
   * plus d'autre chose. Quand elle arrive en tete, le surtitre et le fil
   * d'Ariane d'un reportage de club annoncent « Actualité » — le mot le
   * moins informatif du corpus. On la repousse en fin de liste : la rubrique
   * affichee est la plus precise que le document porte. */
  const cats = (doc.categories || [])
    .map((id) => catById.get(id))
    .filter(Boolean)
    .sort((a, b) => (a.slug === "actualite") - (b.slug === "actualite"));
  const face = isPage ? "page" : faceOf(doc, cats);
  const org = face === "portrait" ? orgOf(doc.slug) : null;
  const kicker = org || cats[0]?.name || (isPage ? "Rubrique" : "Actualité");

  const trail = [["Accueil", "/"]];
  if (cats[0]) trail.push([cats[0].name, `/categorie/${cats[0].slug}/`]);
  trail.push([title, url]);

  const schema = [breadcrumb(trail)];
  if (!isPage) schema.push(newsArticle(doc, url, img?.url));
  else
    schema.push({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description: metaDesc(doc),
      url: SITE + url,
      dateModified: doc.modified_gmt + "Z",
      publisher,
      inLanguage: "fr-FR",
    });

  const sibs = related(doc, posts);

  // Le corps de l'article est du HTML issu du CMS : il a été nettoyé de toute
  // trace WordPress en amont, jamais réécrit sur le fond. On ne touche pas au
  // texte d'un rédacteur.
  let body = cleanContent(doc.content.rendered, doc);
  let rosterBloc = "";
  let blocs = [];

  // Le corps importe s'ouvre sur une <figure> qui porte l'image a la une —
  // celle que le gabarit affiche deja juste au-dessus. Chaque article montrait
  // donc deux fois la meme photo, l'une sous l'autre. On retire celle du
  // corps : le gabarit la presente mieux, en pleine largeur, et la legende
  // qu'elle portait est un credit, pas une information de lecture.
  if (img) {
    body = body.replace(/^\s*<figure[^>]*>[\s\S]*?<\/figure>/i, (bloc) =>
      bloc.includes(img.url) || /wp-content|\/media\//.test(bloc) ? "" : bloc
    ).trim();
  }

  if (isPage && doc.slug === "clubs-mma-francais") ({ body, blocs } = blocsClubs(body, doc));

  // Les pages organisation portaient une grille de portraits alimentee par le
  // CMS. On la regenere a partir du corpus : meme fonction, mais en liens
  // reels, donc indexables et sans JavaScript.
  const orgCat = ORG_CATEGORY[doc.slug];
  if (orgCat) {
    const roster = posts
      .filter((p) => (p.categories || []).some((id) => catById.get(id)?.slug === orgCat))
      .filter((p) => p.slug.startsWith("portrait-"))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (roster.length) {
      // Rendu comme un bloc distinct, hors de `.prose`. Tant qu'il etait
      // concatene au corps, il heritait de la largeur de lecture (720 px) :
      // cinq portraits se serraient dans le tiers gauche d'un ecran large, et
      // aucune regle de debordement ne tenait contre le `max-width` du
      // conteneur. La structure regle ce que le CSS n'arrivait pas a forcer.
      rosterBloc = `\n<h2>Les combattants de cette organisation</h2>\n<div class="roster">\n${roster
        .map((p) => {
          const t = featuredImage(p);
          return `  <a href="/${p.slug}/">${
            t ? `<img src="${vignette(t.url)}" alt="${esc(t.alt)}" loading="lazy" decoding="async" />` : ""
          }<div class="meta"><h3>${esc(decode(p.title.rendered).replace(/^Portrait\s*[:\u2013-]\s*/i, "").split(/[,\u2013]/)[0])}</h3></div></a>`;
        })
        .join("\n")}\n</div>`;
    }
  }

  /* Le titre est compose en display, tres grand, dans une boite de 16
   * caracteres : juste pour « Les champions », faux pour « UFC 315 : Jack
   * Della Maddalena detrone Belal Muhammad et devient champion des poids
   * welters », qui tombait sur six lignes de trois mots. Quarante des cent
   * neuf documents sont dans ce cas.
   *
   * Un journal ne compose pas une manchette et un titre de brève au meme
   * corps. Le CSS ne sait pas mesurer un texte, mais le generateur connait
   * sa longueur : il pose le palier, la feuille de style s'en sert. */
  /* Un titre court peut contenir un mot qui, lui, ne l'est pas :
   * « Konfrontacja Sztuk Walki – KSW » fait trente signes et se composait
   * donc en 84 px, ou « Konfrontacja » depasse a lui seul la colonne. Les
   * pages organisation et plusieurs portraits etaient dans ce cas. On mesure
   * donc les deux : la longueur du titre, et celle de son plus long mot. */
  const motLong = title.split(/[\s\u2013\u2014-]+/).reduce((n, m) => Math.max(n, m.length), 0);
  const palier =
    title.length > 70 ? " t-tres-long"
    : title.length > 48 ? " t-long"
    : motLong >= 14 ? " t-mot-tres-long"
    : motLong >= 11 ? " t-mot-long"
    : "";

  return `${head({
    title: seo,
    description: metaDesc(doc),
    canonical: url,
    image: img?.url,
    type: isPage ? "website" : "article",
    schema,
  })}
${header()}
  <main id="contenu">
  <article class="article face-${face}${palier}">
    <div class="wrap-read">
      <p class="crumbs">${trail
        .map(([n, u], i) =>
          i === trail.length - 1
            ? `<span class="crumb-actuel">${esc(n)}</span>`
            : `<a href="${u}">${esc(n)}</a><span class="crumb-sep"> · </span>`
        )
        .join("")}</p>
      <header class="ah" data-reveal>
        <span class="kicker">${esc(kicker)}</span>
        <h1>${esc(title)}</h1>
        <p class="byline">Rédaction UFC.FR · Publié le <time datetime="${doc.date.slice(0, 10)}">${dateFr(doc.date)}</time>${
          doc.modified.slice(0, 10) !== doc.date.slice(0, 10)
            ? ` · Mis à jour le <time datetime="${doc.modified.slice(0, 10)}">${dateFr(doc.modified)}</time>`
            : ""
        }</p>
      </header>
      ${
        ORG_FICHE[doc.slug]
          ? ouvertureOrg(doc)
          : img
          ? `<figure class="figure lead" data-reveal data-reveal-media><img src="${img.url}" alt="${esc(img.alt)}"${
              img.width && img.height ? ` width="${img.width}" height="${img.height}"` : ""
            } decoding="async" />${
              // Une photo prise chez quelqu'un d'autre se credite. C'est la
              // regle d'un media, pas une option de mise en page.
              img.credit
                ? `<figcaption class="lead-credit">${esc(img.credit)}</figcaption>`
                : face === "portrait" && org
                ? `<figcaption class="lead-org">${esc(org)}</figcaption>`
                : ""
            }</figure>`
          : ""
      }
${tisser(body, blocs)}
${rosterBloc ? `    </div>
    <div class="wrap roster-bloc" data-reveal>${rosterBloc}
    </div>
    <div class="wrap-read${sibs.length ? "" : " wrap-read-vide"}">` : ""}
${
  sibs.length
    ? `      <aside class="related" data-reveal>
        <h2>À lire ensuite</h2>
        <ul class="related-list">
${sibs.map((s) => `          <li><a href="/${s.slug}/">${esc(decode(s.title.rendered))}</a></li>`).join("\n")}
        </ul>
      </aside>`
    : ""
}
    </div>
  </article>
  </main>
${footer()}`;
}

/* ------------------------------------------------------------- exécution  */

console.log("[médias] copie…");
console.log(`  ${copyMedia()} fichiers en place sous /media/`);

console.log("[articles]");
for (const p of posts) emit(p.slug, renderDocument(p, { isPage: false }));
console.log(`  ${posts.length} articles rendus`);

console.log("[pages]");
const skip = new Set(["ufc-fr-mma"]); // l'accueil Elementor : remplacé par notre propre accueil
for (const p of pages) {
  if (skip.has(p.slug)) continue;
  emit(p.slug, renderDocument(p, { isPage: true }));
}
console.log(`  ${pages.length - skip.size} pages rendues`);

/* Sitemap : uniquement la surface publique réellement rendue. */
const urls = written.map(
  (u) => `  <url><loc>${SITE}${u}</loc></url>`
).join("\n");
writeFileSync(
  join(ROOT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE}/</loc><priority>1.0</priority></url>\n${urls}\n</urlset>\n`,
  "utf8"
);
console.log(`[sitemap] ${written.length + 1} URL`);

/* Ce que le generateur a du retirer parce que le CMS le portait a tort. Ce
 * n'est pas un defaut du site : c'est une liste de corrections a faire dans
 * WordPress, et elle doit se voir a chaque construction pour ne pas se faire
 * oublier. */
const intrus = intrusDuCorpus();
if (intrus.length) {
  console.log(`\n[a corriger dans le CMS] ${intrus.length} fiches ouvrent sur le texte d'une autre :`);
  for (const l of intrus) console.log(`  · ${l}`);
}
console.log("\nTerminé.");
