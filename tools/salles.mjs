/**
 * L'annuaire des salles.
 *
 * La page « Les clubs de MMA français » tenait sa liste a la main : douze
 * puces, un nom et une adresse. Une liste ecrite a la main a deux defauts —
 * elle ne montre rien, et elle devient fausse des qu'un club s'ajoute. Elle
 * l'etait deja : les deux salles toulousaines publiees depuis n'y figuraient
 * pas.
 *
 * Ce module reconstruit l'annuaire depuis le corpus. Chaque club couvert
 * produit sa fiche : la photo de son reportage, sa ville, le lien vers notre
 * article, et le lien vers le site du club — celui-la est extrait du corps de
 * l'article, ou le redacteur l'a deja place. Aucune donnee n'est dupliquee
 * ailleurs, donc rien ne peut diverger.
 *
 * Le texte des puces, lui, n'est pas perdu : il est recupere et devient la
 * ligne de presentation de chaque fiche. On ne jette pas ce qu'un redacteur a
 * ecrit, on le remet la ou il se lit.
 */
import {
  posts, pages, categories, cleanContent, decode, esc, stripTags, resume, localMedia, imageMaison, vignette,
} from "./build.mjs";

const CAT = "clubs-mma-francais";

/* La ville ne se devine pas depuis un slug : « apex-mma-strasbourg » se lit,
 * « fondation-mma-marseille-club » aussi, mais « parabellum-nantes-club-mma »
 * et « monkey-gym-rennes-saint-gregoire » designent deux communes. On l'ecrit,
 * une fois, et le reste se deduit. */
const VILLES = {
  "cage-fight-toulouse-club-mma": "Toulouse",
  "boxing-center-toulouse-etats-unis": "Toulouse",
  "boxing-center-ramonville-saint-agne": "Ramonville-Saint-Agne",
  "unlock-paris-17-club-mma": "Paris 17e",
  "nrfight-paris-club-mma": "Paris 13e",
  "fondation-mma-marseille-club": "Marseille",
  "team-ezbiri-lyon-club-mma": "Lyon · Villeurbanne",
  "panthers-club-lille-mma": "Lille",
  "parabellum-nantes-club-mma": "Nantes",
  "fight-n-fit-bordeaux-club-mma": "Bordeaux",
  "cage-training-montpellier-lattes": "Montpellier · Lattes",
  "apex-mma-strasbourg": "Strasbourg",
  "monkey-gym-rennes-saint-gregoire": "Rennes · Saint-Grégoire",
};

/* L'ordre de l'annuaire. Les trois salles de l'aire toulousaine ouvrent
 * ensemble : un annuaire se lit par territoire, pas par date de publication.
 * Le reste suit l'ordre editorial de la page d'origine. */
const ORDRE = [
  "cage-fight-toulouse-club-mma",
  "boxing-center-toulouse-etats-unis",
  "boxing-center-ramonville-saint-agne",
  "unlock-paris-17-club-mma",
  "nrfight-paris-club-mma",
  "fondation-mma-marseille-club",
  "team-ezbiri-lyon-club-mma",
  "panthers-club-lille-mma",
  "parabellum-nantes-club-mma",
  "fight-n-fit-bordeaux-club-mma",
  "cage-training-montpellier-lattes",
  "apex-mma-strasbourg",
  "monkey-gym-rennes-saint-gregoire",
];

/** Toute la rubrique n'est pas une salle : une federation et des portraits de
 *  coachs y sont ranges a juste titre, et n'ont pas d'adresse ou s'entrainer. */
const PAS_UNE_SALLE = new Set([
  "fmmaf-federation-mma-france-clubs",
  "coachs-cage-fight-toulouse-jerome-tancrede-yannis",
  // Carte sans photo : retiree de l'annuaire (placeholder « Pas encore de photo »).
  "maccabi-nice-club-mma",
]);

/* ------------------------------------------------- la liste ecrite a la main
 * On la lit une fois pour en extraire le nom court et la ligne de chaque club,
 * puis on la remplace. Format connu et stable :
 *   <li><a href="/slug/">Nom</a> — texte…</li>
 */
function listeManuelle() {
  const page = pages.find((p) => p.slug === CAT);
  const m = page && cleanContent(page.content.rendered).match(/<h2>Portraits publiés<\/h2>\s*<ul>([\s\S]*?)<\/ul>/);
  const table = new Map();
  if (!m) return table;
  for (const li of m[1].matchAll(/<li>\s*<a href="\/([^/"]+)\/">([^<]+)<\/a>\s*—\s*([\s\S]*?)<\/li>/g)) {
    // La puce ecrivait « Nom — cage homologuee… » : le texte suivait un tiret,
    // donc il commence en minuscule. Sorti de la puce, il devient une phrase.
    // Certaines puces renvoyaient vers un second article (« Portraits des
    // coachs »). Le lien retire, sa ponctuation restait detachee. On recolle
    // le point et la virgule seulement : en francais, le deux-points et le
    // point-virgule gardent leur espace.
    const ligne = decode(stripTags(li[3]))
      .replace(/\s+/g, " ")
      .replace(/\s+([.,])/g, "$1")
      .trim();
    table.set(li[1], {
      nom: decode(li[2]).trim(),
      ligne: ligne.charAt(0).toUpperCase() + ligne.slice(1),
    });
  }
  return table;
}

/** La premiere phrase entiere d'un texte, sans point de suspension. */
function phrase(texte, max = 145) {
  const t = String(texte || "").replace(/\s*[.…]+\s*$/, "");
  const fin = t.search(/[.!?](?:\s|$)/);
  const une = fin > 24 ? t.slice(0, fin + 1) : t;
  if (une.length <= max) return une;
  const coupe = une.lastIndexOf(" ", max);
  return une.slice(0, coupe > 40 ? coupe : max).replace(/[,;:]$/, "") + "…";
}

/** Le site officiel du club, tel qu'il est deja cite dans l'article. */
function siteDuClub(doc) {
  for (const a of doc.content.rendered.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const u = a[1];
    if (/ufc\.fr|wikipedia|wikimedia|facebook|instagram|youtube|twitter|x\.com|google\./i.test(u)) continue;
    return u;
  }
  return null;
}

/** boxingcenter.fr — le domaine, sans le protocole ni le chemin. C'est ce que
 *  le lecteur reconnait, et c'est ce qui tient sur une ligne de fiche. */
function domaine(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

/* Aucune salle de l'annuaire n'est forcee sans photo pour l'instant.
 * (Maccabi Nice a ete retire de l'annuaire plutot que de garder un cadre vide.) */
const SANS_PHOTO = new Set();

function photo(doc) {
  if (SANS_PHOTO.has(doc.slug)) return null;
  const maison = imageMaison(doc.slug);
  if (maison) return { url: maison.url, alt: decode(doc.title.rendered) };
  const fm = doc._embedded?.["wp:featuredmedia"]?.[0];
  if (!fm?.source_url) return null;
  const l = localMedia(fm.source_url);
  return { url: l ? l.url : fm.source_url, alt: fm.alt_text || decode(doc.title.rendered) };
}

/** Toutes les salles couvertes, dans l'ordre de l'annuaire. */
export function annuaire() {
  const cat = categories.find((c) => c.slug === CAT);
  if (!cat) return [];
  const manuelle = listeManuelle();
  const parSlug = new Map(
    posts
      .filter((p) => (p.categories || []).includes(cat.id) && !PAS_UNE_SALLE.has(p.slug))
      .map((p) => [p.slug, p])
  );

  // L'ordre ecrit d'abord, puis ce que le corpus contient en plus : un club
  // publie demain apparait sans qu'on ait a toucher a ce fichier.
  const slugs = [...ORDRE.filter((s) => parSlug.has(s)), ...[...parSlug.keys()].filter((s) => !ORDRE.includes(s))];

  return slugs.map((slug) => {
    const doc = parSlug.get(slug);
    const dit = manuelle.get(slug);
    const titre = decode(doc.title.rendered);
    const site = SITES_OFFICIELS[slug] || null;
    return {
      slug,
      // Le nom court : celui de la liste s'il existe, sinon le titre coupe
      // avant les deux-points — « Apex MMA Strasbourg : grappling… » est un
      // titre d'article, pas un nom de salle.
      nom: dit?.nom || titre.split(/\s*:\s*/)[0],
      ville: VILLES[slug] || "",
      // La ligne d'une fiche se termine. Une coupe a 130 signes laissait
      // « deux rings, un plateau de tapis, et du… » sous une photo : une
      // phrase interrompue dit qu'on n'a pas relu. On prend la premiere
      // phrase entiere, et on ne tronque que si elle est vraiment longue.
      ligne: doc.ligne_annuaire || dit?.ligne || phrase(resume(doc, 260)),
      photo: photo(doc),
      interne: `/${slug}/`,
      site,
      siteNom: site ? domaine(site) : null,
    };
  });
}

/** Sites officiels des salles toulousaines — seuls liens sortants autorises
 *  dans l'annuaire. Les URL extraites du corps d'article peuvent etre
 *  perimees (boxingcenter.fr) : on force ici les domaines a jour. */
const SITES_OFFICIELS = {
  "cage-fight-toulouse-club-mma": "https://club-mma-toulouse.com/",
  "boxing-center-toulouse-etats-unis": "https://clubmma.fr/",
  "boxing-center-ramonville-saint-agne": "https://mmatoulouse.com/",
};

/** Liens sortants autorises : uniquement les salles toulousaines
 *  (Cage Fight + Boxing Center). Les autres fiches gardent seulement
 *  « Le reportage » vers UFC.FR. */
const LIENS_SORTANTS = new Set(Object.keys(SITES_OFFICIELS));

/** Une fiche de l'annuaire. Deux liens, jamais un seul : le reportage chez
 *  nous, et le site du club. Le lecteur doit savoir lequel le fait sortir. */
export function fiche(s, { lazy = true, anime = false } = {}) {
  // Le devoilement ne sert que les trois fiches de l'accueil. Sur les quatorze
  // de l'annuaire il decore, et chaque carte qui entre coute une couche de
  // composition en plein defilement.
  const lienSortant =
    s.site && LIENS_SORTANTS.has(s.slug)
      ? `<a class="salle-site" href="${s.site}" rel="noopener">${esc(s.siteNom)} <i aria-hidden="true">↗</i></a>`
      : "";
  return `        <article class="salle"${anime ? " data-reveal" : ""}>
          <a class="salle-media${s.photo ? "" : " salle-media-vide"}" href="${s.interne}"${anime ? " data-reveal-media" : ""}>${
            s.photo
              ? `<img src="${vignette(s.photo.url)}" alt="${esc(s.photo.alt)}"${lazy ? ' loading="lazy"' : ""} decoding="async" />`
              : `<span>Pas encore de photo<b>Le club n’en publie aucune</b></span>`
          }</a>
          <div class="salle-corps">
            ${s.ville ? `<span class="salle-ville">${esc(s.ville)}</span>` : ""}
            <h3><a href="${s.interne}">${esc(s.nom)}</a></h3>
            <p>${esc(s.ligne)}</p>
            <p class="salle-liens">
              <a class="salle-lire" href="${s.interne}">Le reportage</a>
              ${lienSortant}
            </p>
          </div>
        </article>`;
}
