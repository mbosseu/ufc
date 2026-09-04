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
import { posts, categories, ROOT, SITE, esc, decode, stripTags, dateFr, localMedia, resume, imageMaison, vignette, jeuDeLargeurs } from "./build.mjs";
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
  const maison = imageMaison(p?.slug);
  if (maison) return { url: maison.url, alt: decode(p.title.rendered) };
  const fm = p?._embedded?.["wp:featuredmedia"]?.[0];
  if (!fm?.source_url) return null;
  const l = localMedia(fm.source_url);
  return { url: l ? l.url : fm.source_url, alt: fm.alt_text || "", w: fm.media_details?.width, h: fm.media_details?.height };
}
/**
 * L'image du bloc « a la une ».
 *
 * Elle ne peut etre ni absente ni deja vue. La photo maison choisie par slug
 * donnait Hooker pour « ufc-paris-2026-carte-complete-hooker-parnasse » —
 * l'homme qui occupe deja la moitie droite du heros, deux cents pixels plus
 * haut. On essaie donc dans l'ordre : la photo maison si elle est libre,
 * sinon celle de l'article dans le CMS, sinon la premiere disponible.
 */
function imageDuBloc(p) {
  const candidats = [];
  const maison = imageMaison(p?.slug);
  if (maison) candidats.push({ url: maison.url, alt: decode(p.title.rendered) });
  const fm = p?._embedded?.["wp:featuredmedia"]?.[0];
  if (fm?.source_url) {
    const l = localMedia(fm.source_url);
    candidats.push({
      url: l ? l.url : fm.source_url,
      alt: fm.alt_text || decode(p.title.rendered),
      w: fm.media_details?.width,
      h: fm.media_details?.height,
    });
  }
  return candidats.find((c) => !vues.has(nomDeFichier(c.url))) || candidats[0] || null;
}

/**
 * Une image qui ne peut pas manquer.
 *
 * `pic()` rend une chaine vide des que la photo a deja servi sur la page.
 * C'est juste pour un bloc secondaire ; c'est un trou pour une carte, qui
 * reserve 220 px de haut a son illustration. Les deux fiches Boxing Center
 * de l'accueil sortaient ainsi sans image : leurs photos etaient reservees
 * par la section « salles » quelques centaines de pixels plus bas.
 *
 * Ici la regle s'inverse : on prend la premiere photo libre, et s'il n'y en
 * a aucune de libre on repete plutot que de laisser le cadre vide. Un
 * doublon se remarque ; un trou se remarque davantage.
 */
function picSure(p, cls = "", grand = false) {
  const m = imageDuBloc(p);
  if (!m) return "";
  vues.add(nomDeFichier(m.url));
  const src = grand ? m.url : vignette(m.url);
  return `<img src="${src}" alt="${esc(m.alt)}"${m.w && m.h ? ` width="${m.w}" height="${m.h}"` : ""}${grand ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${cls ? ` class="${cls}"` : ""} />`;
}

// La rubrique la plus precise, pas la premiere : « Actualite » contient
// presque tout et ne distingue rien.
const rubrique = (p) =>
  categories
    .filter((c) => (p.categories || []).includes(c.id))
    .sort((a, b) => (a.slug === "actualite") - (b.slug === "actualite"))[0]?.name || "Actualité";

const T = (p) => esc(decode(p.title.rendered));
const X = (p, n = 130) => esc(resume(p, n));

// Les images deja posees sur la page. L'accueil n'avait pas de
// dedoublonnage — seules les listes en avaient — et le heros, une carte et le
// roster pouvaient montrer trois fois le meme homme.
const vues = new Set();

/**
 * Une image de bloc.
 *
 * `grand` sert le fichier d'origine au lieu de la vignette de 640 px : le
 * bloc « a la une » occupe toute la largeur sur cinq cents pixels de haut,
 * une vignette y serait floue.
 *
 * Le dedoublonnage compare les noms de fichier, pas les URL : depuis que les
 * listes servent des vignettes, `/img/hooker.webp` et
 * `/media/vignettes/hooker.webp` sont la meme photo sous deux adresses, et
 * la page pouvait la montrer deux fois.
 */
const nomDeFichier = (u) => String(u).split("/").pop().replace(/\.[a-z0-9]+$/i, "");

function pic(p, cls = "", unique = true, grand = false) {
  const m = media(p);
  if (!m) return "";
  const cle = nomDeFichier(m.url);
  if (unique) {
    if (vues.has(cle)) return "";
    vues.add(cle);
  } else {
    vues.add(cle);
  }
  const src = grand ? m.url : vignette(m.url);
  return `<img src="${src}" alt="${esc(m.alt)}"${m.w && m.h ? ` width="${m.w}" height="${m.h}"` : ""}${grand ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"${cls ? ` class="${cls}"` : ""} />`;
}

// Le heros et la section « salles » posent leurs images en dur : on les
// reserve avant que le fil se serve, sinon les deux fiches Boxing Center
// reviennent en carte avec la meme photo quelques centaines de pixels plus
// haut.
for (const f of ["parnasse", "hooker", "gym", "boxing-center-etats-unis", "boxing-center-ramonville"]) vues.add(f);

const paris = inCat("ufc-paris-2026");
const clubs = inCat("clubs-mma-francais");
const portraits = byDate.filter((p) => p.slug.startsWith("portrait-"));
// Le fil de l'accueil : ni portraits ni fiches de salle. Les deux ont leur
// section plus bas, avec leur photo. Sans ce filtre, les deux fiches Boxing
// Center sortaient en carte sous la une — avec la meme photo que la section
// « salles » huit cents pixels plus bas, et rien de plus a dire.
const fil = byDate
  .filter((p) => !p.slug.startsWith("portrait-") && !clubs.some((c) => c.id === p.id))
  .slice(0, 12);

// Le dossier Bercy ouvre la page : trois jours avant l'événement, c'est la
// seule hiérarchie défendable.
const une = bySlug("ufc-paris-2026-date-lieu-carte-enjeux") || paris[0];
const carte = bySlug("ufc-paris-2026-carte-complete-hooker-parnasse") || paris[1];

/* La photo de la une est choisie et reservee ici, avant les cartes.
   Elle l'etait au rendu, c'est-a-dire apres : les cartes croyaient libre une
   image que la une allait prendre, et l'une des deux sortait avec la photo
   du heros. Une reservation qui arrive apres la selection ne reserve rien. */
const mediaUne = imageDuBloc(carte || une);
if (mediaUne) vues.add(nomDeFichier(mediaUne.url));

/**
 * Les deux cartes sous la une.
 *
 * Elles reservent 220 px de haut a une photo : ce sont les deux seuls blocs
 * illustres du palier. On prend donc les deux premiers articles du fil qui
 * ont encore une photo libre, pas les deux premiers tout court — sinon la
 * carte sortait avec l'image du heros, deja posee huit cents pixels plus
 * haut. L'ordre du fil est chronologique et douze articles s'y presentent :
 * en sauter un ou deux ne change pas la hierarchie, montrer deux fois la
 * meme photo si.
 */
const cartes = [];
for (const p of fil) {
  if (cartes.length === 2) break;
  const m = imageDuBloc(p);
  if (m && !vues.has(nomDeFichier(m.url))) cartes.push(p);
}
// Faute de deux photos libres, on complete par le debut du fil — sans
// reprendre celui qu'on vient de retenir.
for (const p of fil) {
  if (cartes.length === 2) break;
  if (!cartes.includes(p)) cartes.push(p);
}
const reste = fil.filter((p) => !cartes.includes(p));


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
    logo: { "@type": "ImageObject", url: SITE + "/logo/ufc-fr.webp" },
    description: "Média indépendant d’actualité MMA en France et à l’international. Non affilié à l’Ultimate Fighting Championship.",
    diversityPolicy: SITE + "/a-propos/",
    ethicsPolicy: SITE + "/a-propos/",
  },
  {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: "UFC Paris 2026 — Hooker vs Parnasse",
    startDate: "2026-09-05T21:00:00+02:00",
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: "Accor Arena",
      address: { "@type": "PostalAddress", addressLocality: "Paris", addressCountry: "FR" },
    },
    sport: "Mixed Martial Arts",
    url: SITE + "/carte/ufc-paris-2026/",
  },
];

/**
 * Le compte a rebours, ecrit des la construction.
 *
 * Le repli sans JavaScript affichait « 21h00 » — l'heure de l'evenement — a
 * l'endroit exact ou le script ecrit « 46h00 », qui veut dire « dans 46
 * heures ». Meme forme, sens oppose. Un lecteur sans JavaScript, ou pendant
 * les deux cents millisecondes qui precedent son execution, lisait donc une
 * information fausse.
 *
 * On applique ici la regle du script, au mot pres : au-dela de deux jours on
 * parle en jours, en deca en heures et minutes. La valeur vieillit entre
 * deux constructions, mais elle vieillit dans le bon sens — elle reste un
 * compte a rebours, et le script la corrige des qu'il tourne.
 */
const EVENEMENT = "2026-09-05T21:00:00+02:00";
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
    "Média MMA indépendant, pas le site officiel de l’UFC. UFC Paris 2026, résultats, champions de toutes les organisations et clubs français.",
  canonical: "/",
  image: "/media/brand/ufc-fr-og.jpg",
  type: "website",
  schema,
})}
${header("/", "home")}
  <main id="contenu">

  <!-- Palier 1 — l'evenement.
       Pas de cadre decoratif ici : l'octogone appartient a la page carte, ou
       il porte la progression dans la soiree. Le reprendre sur l'accueil en
       ornement, c'etait du decor qui ne dit rien — et il masquait les photos.
       Ce qui reste tient tout seul : deux hommes, la couture entre eux, leurs
       noms, et le compte a rebours, qui est l'information la plus utile de la
       page a trois jours de Bercy. -->
  <section class="hero hero-cage">

    <div class="hero-duel">
      <figure class="hero-man a">
        <img src="/img/parnasse.webp" alt="Salahdine Parnasse, double champion KSW, avant ses debuts a l'UFC" width="1200" height="1600" fetchpriority="high" />
        <figcaption>
          <span class="kicker">France · Debuts UFC</span>
          <span class="hero-name">Parnasse</span>
        </figcaption>
      </figure>
      <p class="hero-vs" aria-hidden="true">contre</p>
      <figure class="hero-man b">
        <img src="/img/hooker.webp" alt="Dan Hooker, poids legers, Nouvelle-Zelande" width="1200" height="1600" fetchpriority="high" />
        <figcaption>
          <span class="kicker">Nouvelle-Zelande</span>
          <span class="hero-name">Hooker</span>
        </figcaption>
      </figure>
    </div>

    <div class="hero-foot">
      <p class="hero-when">
        <time datetime="2026-09-05T21:00:00+02:00">Samedi 5 septembre · Accor Arena</time>
        <b data-countdown="${EVENEMENT}">${compteARebours()}</b>
      </p>
      <div class="hero-actions">
        <a class="btn btn-fill cut" href="/carte/ufc-paris-2026/">La carte, combat par combat</a>
        <a class="btn btn-line cut" href="/${une.slug}/">Le dossier</a>
      </div>
    </div>
  </section>

  <!-- Le bandeau d'info. Un ticker qui ne defile pas n'est pas un ticker,
       c'est une ligne de texte. Le contenu est double dans le balisage : la
       boucle se ferme sans saut parce que la seconde copie prend la place de
       la premiere exactement quand celle-ci sort. Le point rouge, lui, reste
       fixe — c'est le repere, il ne defile pas avec l'information. -->
  <div class="ticker">
    <div class="pulse"><b></b></div>
    <div class="ticker-rail">
      <div class="ticker-run">
${[
  ["Samedi 5 sept.", "Accor Arena · préliminaires 18h, carte principale 21h"],
  ["Hooker–Parnasse", "Main event, poids légers"],
  ["Neuf Français", "Sur la carte de Bercy"],
  ["Ziam–Sola", "Duel tricolore en poids légers"],
  ["Santos forfait", "Le combat de Wood à confirmer"],
  [`${posts.length} articles`, "Toutes organisations, en français"],
]
  .concat([
    ["Samedi 5 sept.", "Accor Arena · préliminaires 18h, carte principale 21h"],
    ["Hooker–Parnasse", "Main event, poids légers"],
    ["Neuf Français", "Sur la carte de Bercy"],
    ["Ziam–Sola", "Duel tricolore en poids légers"],
    ["Santos forfait", "Le combat de Wood à confirmer"],
    [`${posts.length} articles`, "Toutes organisations, en français"],
  ])
  .map(([t, d], i) => `        <span class="tick"${i >= 6 ? ' aria-hidden="true"' : ""}><strong>${esc(t)}</strong><span>${esc(d)}</span></span>`)
  .join("\n")}
      </div>
    </div>
  </div>

  <!-- Palier 2 — le fil. Refus de la grille égale : une pièce large, deux
       moyennes, puis une liste. La hiérarchie est l'information. -->
  <section class="block ed-week">
    <div class="wrap ed-head" data-reveal>
      <span class="kicker">À la une</span>
      <h1>L’actualité du MMA, en français</h1>
      <p class="lede">Bercy dans trois jours. Le reste du MMA n’attend pas.</p>
      <a class="more" href="/actualite-du-mma/">Tout le fil (${posts.length})</a>
    </div>
    <a class="ed-lead" href="/${carte ? carte.slug : une.slug}/" data-reveal data-reveal-media>
      <div class="ed-lead-media">${
        /* `unique: false` : c'est le plus grand bloc editorial de la page, il
         * passe avant le dedoublonnage. Il rendait un cadre vide de cinq
         * cents pixels — la photo de Bercy avait deja ete prise par un autre
         * bloc, et `pic()` renvoie une chaine vide quand l'image est deja
         * vue. Un doublon se remarque ; un trou se remarque davantage. */
        mediaUne
          ? `<img src="${mediaUne.url}" alt="${esc(mediaUne.alt)}"${
              mediaUne.w && mediaUne.h ? ` width="${mediaUne.w}" height="${mediaUne.h}"` : ""
            }${
              /* 224 Ko de facade de Bercy telecharges sur un telephone de
               * 390 px de large. Le navigateur choisit sa largeur. */
              (() => {
                const jeu = jeuDeLargeurs(mediaUne.url);
                return jeu ? ` srcset="${jeu}" sizes="100vw"` : "";
              })()
            } fetchpriority="high" decoding="async" />`
          : ""
      }</div>
      <div class="ed-lead-copy">
        <span class="kicker">Dossier</span>
        <h2>${T(carte || une)}</h2>
        <p>${X(carte || une, 150)}</p>
      </div>
    </a>
    <div class="wrap ed-aside">
${cartes
  .map(
    (p) => `      <a class="ed-aside-item" href="/${p.slug}/" data-reveal>
        <div class="ed-aside-media">${picSure(p)}</div>
        <div>
          <span class="kicker">${esc(rubrique(p))}</span>
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
${/* Le chiffre est ecrit des la construction, pas laisse a zero.
     Sans JavaScript — ou pendant les deux cents millisecondes qui precedent
     son execution — la page annoncait « 0 articles, 0 portraits, 0 clubs
     francais ». Un media qui affiche zero article se decrit comme vide.
     Le script anime la montee quand le bloc entre a l'ecran ; s'il ne tourne
     pas, la verite reste affichee. */ ""}
        <p class="compteur"><b data-compte="${posts.length}">${posts.length}</b><span>articles</span></p>
        <p class="compteur"><b data-compte="${portraits.length}">${portraits.length}</b><span>portraits</span></p>
        <p class="compteur"><b data-compte="${annuaire().length}">${annuaire().length}</b><span>clubs français</span></p>
        <p class="compteur"><b data-compte="7">7</b><span>organisations</span></p>
      </div>
      <div class="split-list home-list">
${reste
  .map(
    (p, i) => `        <a class="row" href="/${p.slug}/" data-reveal>
          <span class="pos">${String(i + 1).padStart(2, "0")}</span>
          <span class="nm">${T(p)}</span>
          <span class="cat">${esc(rubrique(p))}</span>
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
${(() => {
  /* Douze vignettes de taille egale ne disent rien de plus que douze liens.
   * La premiere prend deux rangees et porte son organisation : la grille
   * cesse d'etre un damier et redevient une page.
   *
   * Et elle ne prend pas le premier portrait venu : a trois jours de Bercy,
   * ce sont les combattants de la carte qui ouvrent. Ceux qui n'ont pas de
   * fiche chez nous sont simplement absents de la liste — on ne fabrique pas
   * une vedette pour remplir une case. */
  const VEDETTES = ["portrait-ksw-slahdine-parnasse", "portrait-ares-axel-sola"];
  const rang = (p) => {
    const i = VEDETTES.indexOf(p.slug);
    return i < 0 ? VEDETTES.length : i;
  };
  const liste = [...portraits].sort((a, b) => rang(a) - rang(b)).slice(0, 12);
  const orgDe = (p) =>
    categories
      .filter((c) => (p.categories || []).includes(c.id))
      .find((c) => ["ufc", "pfl", "one-championship", "ksw", "ares", "cage-warriors", "hexagone-mma"].includes(c.slug))?.name || "";
  return liste
    .map((p, i) => {
      // Le systeme de design attend `.roster a > .meta > h3`. Un <span> nu
      // passe sous l'image, qui est en position absolue : le nom etait rendu,
      // et invisible. On emet le balisage que la feuille de style connait.
      const nom = esc(
        decode(p.title.rendered).replace(/^Portrait\s*[:–-]\s*/i, "").split(/[,–]/)[0]
      );
      const org = orgDe(p);
      return `        <a class="${i === 0 ? "lead" : ""}" href="/${p.slug}/"${
        i === 0 ? "" : " data-reveal"
      }>${
        /* La tete d'affiche ne peut pas sortir sans photo : elle occupe deux
         * rangees. `pic()` rend une chaine vide quand l'image a deja servi —
         * et celle de Parnasse est reservee par le heros. `picSure()` prend
         * alors la suivante disponible, ici son illustration du CMS. */
        i === 0 ? picSure(p, "", true) : pic(p)
      }<div class="meta">${
        org ? `<span class="kicker">${esc(org)}</span>` : ""
      }<h3>${nom}</h3></div></a>`;
    })
    .join("\n");
})()}
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
          <h2>Où ça se boxe, en France</h2>
          <p class="lede">${/* Le compte de l'annuaire, pas celui de la rubrique : la rubrique
               contient aussi une federation et des portraits de coachs, et
               l'accueil annoncait seize salles la ou la page en montre
               quatorze. */ annuaire().length} salles couvertes. On y va une par une, et on dit ce qu’on a vérifié.</p>
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
          <li><a href="/organisations/"><em>04</em><span><strong>Les organisations</strong><b>Qui organise quoi, et pour qui.</b></span></a></li>
        </ul>
      </div>
      <div class="ed-keys-photo" data-reveal data-reveal-media>
        <!-- ceinture.webp est un gros plan flou d'une ceinture posee. Il
             ouvrait ce bloc sur une image dont on ne distingue rien, dans le
             seul endroit de l'accueil ou la photo est purement illustrative
             — donc le seul ou elle n'a que sa qualite pour elle.
             ceinture-combat.webp montre un champion tenant la sienne : c'est
             net, et ca dit ce que le bloc annonce. -->
        <img src="/img/ceinture-combat.webp" alt="Un champion UFC tenant sa ceinture" width="1417" height="2126" loading="lazy" decoding="async" />
      </div>
    </div>
  </section>

  </main>
${footer()}`;

writeFileSync(join(ROOT, "index.html"), html, "utf8");
console.log("[accueil] index.html régénéré depuis le corpus");
console.log(`  une: ${une.slug}`);
console.log(`  fil: ${fil.length} · portraits: ${portraits.length} · clubs: ${clubs.length}`);
