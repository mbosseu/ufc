/**
 * Générateur UFC.FR — rend les 107 documents extraits du WordPress dans la
 * direction artistique du site recodé.
 *
 * Pourquoi un générateur et pas des pages à la main : le cahier des charges
 * demande plusieurs articles par semaine indéfiniment (§15) avec un pipeline
 * assisté (§16). Écrire chaque article en HTML condamne la cadence. Ici, un
 * article = un objet dans data/wp/, et la mise en page est appliquée une fois.
 *
 * Pourquoi les slugs du WordPress : le domaine www.ufc.fr va basculer sur ce
 * site. En rendant /organisation-mma-ksw/ à l'identique, les URL déjà indexées
 * survivent sans une seule redirection — donc sans perte de position au moment
 * exact où le trafic arrive.
 *
 * Règle absolue : rien dans le HTML rendu ne doit trahir WordPress. Ni chemin
 * wp-content, ni classe wp-*, ni marquage Elementor. Le CMS a été la source,
 * il n'est pas l'histoire.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "data", "wp");
const SITE = "https://ufc.fr";
const BRAND = "UFC.FR";

const read = (f) => JSON.parse(readFileSync(join(DATA, f), "utf8"));
const posts = read("posts.json");
const pages = read("pages.json");
const categories = read("categories.json");
const mediaManifest = existsSync(join(DATA, "media-manifest.json")) ? read("media-manifest.json") : [];

/* ------------------------------------------------------- articles maison --
 * Le cahier des charges demande plusieurs articles par semaine, indefiniment
 * (§15), avec un pipeline assiste (§16). Tant que le corpus se limitait a
 * l'extraction du CMS, ecrire un nouvel article voulait dire retoucher le
 * generateur — c'est-a-dire ne pas pouvoir en ecrire.
 *
 * Un article maison est un fichier JSON dans data/articles/. Il est traduit
 * ici dans la forme d'un article du CMS, puis rejoint le corpus : page
 * dediee, rubrique, fil, recherche, sitemap, corpus machine et serveur MCP le
 * reprennent sans une ligne de plus.
 */
const DIR_MAISON = join(ROOT, "data", "articles");
const catParSlug = new Map(categories.map((c) => [c.slug, c]));

function articlesMaison() {
  if (!existsSync(DIR_MAISON)) return [];
  return readdirSync(DIR_MAISON)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const a = JSON.parse(readFileSync(join(DIR_MAISON, f), "utf8"));
      const ids = [a.categorie, ...(a.categories_secondaires || [])]
        .map((slug) => catParSlug.get(slug)?.id)
        .filter(Boolean);

      // Le chapo ouvre l'article et sert de resume ; la mention de source et
      // le lien vers le club ferment le corps. Les assembler ici plutot que
      // dans le JSON garde les fiches lisibles et la mise en forme unique.
      const corps =
        `<p class="chapo">${a.chapo}</p>\n` +
        a.corps +
        (a.lien_club
          ? `\n<p class="renvoi">Horaires, tarifs et inscriptions changent d’une saison à l’autre : le club les tient à jour sur <a href="${a.lien_club.url}" rel="noopener">${a.lien_club.texte}</a>.</p>`
          : "") +
        (a.source ? `\n<p class="source-note">${a.source}</p>` : "");

      return {
        id: 900000 + Math.abs([...a.slug].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % 90000,
        slug: a.slug,
        date: `${a.date}T09:00:00`,
        date_gmt: `${a.date}T07:00:00`,
        modified: `${a.date}T09:00:00`,
        modified_gmt: `${a.date}T07:00:00`,
        title: { rendered: a.titre },
        content: { rendered: corps },
        excerpt: { rendered: `<p>${a.chapo}</p>` },
        categories: ids,
        maison: true,
        // La ligne que la fiche d'annuaire affiche. Sans elle, on retombe sur
        // la premiere phrase du chapo — juste, mais souvent trop courte pour
        // dire ou se trouve la salle et ce qu'elle contient.
        ligne_annuaire: a.ligne_annuaire || "",
        // Un titre d'onglet n'est pas une manchette : la fiche garde son titre
        // editorial, et `titre_seo` porte la version qui tient dans un
        // resultat de recherche. Sans lui, on retombe sur le titre entier.
        yoast_head_json: { title: a.titre_seo || a.titre, description: a.meta_description },
        _embedded: a.image
          ? {
              "wp:featuredmedia": [
                {
                  source_url: a.image,
                  alt_text: a.image_alt || "",
                  title: { rendered: a.image_alt || "" },
                  credit: a.image_credit || "",
                  media_details: {},
                },
              ],
            }
          : undefined,
      };
    });
}

const maison = articlesMaison();
posts.push(...maison);

/* ---------------------------------------------------------------- médias --
 * Les binaires vivent dans /media/ à la racine. On garde le nom de fichier
 * d'origine : les slugs WP sont déjà descriptifs, et c'est ce qui permet de
 * retrouver une image à l'œil dans le dépôt.
 */
const mediaByUrl = new Map();
for (const m of mediaManifest) {
  const path = new URL(m.source_url).pathname;
  const name = basename(path);
  // Un seul chemin canonique : /media/AAAA/MM/fichier, exactement l'arborescence
  // que WordPress servait. Toute autre convention finit par diverger de ce que
  // le corps des articles contient deja en dur, et produit des images mortes.
  const rel = path.replace(/^\/wp-content\/uploads\//, "");
  mediaByUrl.set(m.source_url, { url: `/media/${rel}`, ...m });
  // WordPress sert aussi des variantes redimensionnées (-1024x768) et « -scaled ».
  // Elles pointent le même fichier source : on les rabat toutes sur l'original.
  const stem = name.replace(/\.[a-z0-9]+$/i, "");
  mediaByUrl.set(stem, { url: `/media/${rel}`, ...m });
}

/* ------------------------------------------------------------- curation --
 * Les images a la une venues du CMS sont generiques : la facade de Bercy et
 * un octogone de stock illustrent la moitie du corpus, y compris des articles
 * sur une personne nommee. Le depot, lui, contient les vraies photos.
 *
 * On rapproche donc le sujet de l'article de sa photo : si le slug nomme
 * quelqu'un dont on a le portrait, c'est ce portrait qui illustre. C'est la
 * difference entre un site alimente et un site tenu.
 */
/* ------------------------------------------------ photos attribuees --
 * Une photo nommee pour un slug precis, sans devinette ni motif.
 *
 * Douze reportages de club partageaient la meme photo d'illustration : un
 * boxeur generique servait de facade a Toulouse, Paris, Lille et Nantes a la
 * fois. C'est le meme defaut que la galerie de ceintures — une image qui ne
 * montre pas ce dont l'article parle ne l'illustre pas, elle le remplit.
 *
 * Chaque salle a desormais sa photo, prise sur le site du club et creditee.
 * Le credit n'est pas une politesse : on publie l'image de quelqu'un d'autre,
 * on dit de qui elle vient. Nice reste sans photo — son site n'en publie
 * aucune — et garde donc le repli : mieux vaut un manque qu'un faux.
 */
const PHOTOS_EXACTES = {
  "cage-fight-toulouse-club-mma": ["/media/clubs/cage-fight-toulouse.webp", "Photo Cage Fight Toulouse"],
  "unlock-paris-17-club-mma": ["/media/clubs/unlock-paris-17.webp", "Photo Unlock Paris 17"],
  "nrfight-paris-club-mma": ["/media/clubs/nrfight-paris.webp", "Photo NRFight Paris"],
  "fondation-mma-marseille-club": ["/media/clubs/fondation-mma-marseille.webp", "Photo Fondation MMA Marseille"],
  "team-ezbiri-lyon-club-mma": ["/media/clubs/team-ezbiri-lyon.webp", "Photo Team Ezbiri"],
  "panthers-club-lille-mma": ["/media/clubs/panthers-club-lille.webp", "Photo Panthers Club Lille"],
  "parabellum-nantes-club-mma": ["/media/clubs/parabellum-nantes.webp", "Photo Julia Briend · Parabellum Combat Club"],
  "fight-n-fit-bordeaux-club-mma": ["/media/clubs/fight-n-fit-bordeaux.webp", "Photo Fight\u2019n\u2019Fit Bordeaux"],
  "cage-training-montpellier-lattes": ["/media/clubs/cage-training-lattes.webp", "Photo Cage Training"],
  "apex-mma-strasbourg": ["/media/clubs/apex-mma-strasbourg.webp", "Photo Apex MMA Strasbourg"],
  "monkey-gym-rennes-saint-gregoire": ["/media/clubs/monkey-gym-rennes.webp", "Photo Monkey Gym"],
  "coachs-cage-fight-toulouse-jerome-tancrede-yannis": ["/media/clubs/coachs-cage-fight-toulouse.webp", "Photo Cage Fight Toulouse"],
  // La page de rubrique s'ouvrait sur une cage polonaise de banque d'images,
  // et la partageait avec deux articles. Une salle francaise vide, avant le
  // cours, dit mieux ce dont la page parle.
  "clubs-mma-francais": ["/media/clubs/rubrique-clubs.webp", "Photo Panthers Club Lille"],
  // ARES et Hexagone partageaient la meme photo « organisations » : cote a
  // cote dans une grille, les deux pages se ressemblaient au point de sembler
  // la meme. Le depot contenait deja une dizaine de photos jamais servies.
  "organisation-mma-ares-fighting-championship": ["/img/octagon.webp", ""],

  /* Cinq articles sans rapport entre eux — un gala rouennais, une carte ARES,
   * un guide des categories de poids, deux resultats UFC — portaient le meme
   * octogone de banque d'images. Chacun recoit une photo qui parle au moins
   * de son sujet : la pesee pour le guide des poids, la cage pour les galas,
   * le sol pour les resultats. Le depot les contenait deja, inutilisees. */
  "hexagone-mma-rouen-12-septembre-2026": ["/img/victoire.webp", ""],
  "ares-43-oconnor-diatta-adidas-arena": ["/img/fight.webp", ""],
  "categories-poids-mma-guide": ["/img/pesee.webp", ""],
  "ufc-shanghai-song-yadong-ko-umar-nurmagomedov": ["/img/clinch.webp", ""],
  "ufc-sacramento-rodrigues-hernandez-resultats": ["/img/grappling.webp", ""],
  // Six articles ouvraient sur la meme facade de Bercy. Ceux qui parlent de
  // la salle la gardent ; l'explication du fonctionnement d'une carte, non.
  "comment-fonctionne-carte-ufc": ["/img/gants.webp", ""],
  /* Echange entre deux pages de reference. « Champions MMA actuels »
   * s'ouvrait sur un tapis d'octogone couvert de baches publicitaires — pas
   * un champion, pas une ceinture, rien du sujet ; elle recoit la ceinture,
   * qui est litteralement ce dont elle parle et qui ne nomme personne. Les
   * classements heritent de l'octogone : une hierarchie de division se dit
   * mieux par la cage que par un titre.
   *
   * La photo de champion tenant sa ceinture reste ecartee des deux : elle
   * date de 2012, et illustrer « actuels » avec un champion d'il y a
   * quatorze ans, c'est se tromper de sens. */
  "champions-mma-actuels": ["/img/ceinture.webp", ""],
  "classements-ufc-aout-2026": ["/media/2026/08/ufc-octagon-usmc-scaled.jpg", ""],
};

const PORTRAITS_MAISON = {
  parnasse: "/img/parnasse.webp", hooker: "/img/hooker.webp", ziam: "/img/ziam.webp",
  sola: "/img/sola.webp", charriere: "/img/charriere.webp", sy: "/img/sy.webp",
  cornolle: "/img/cornolle.webp", duclos: "/img/duclos.webp", aljarouj: "/img/aljarouj.webp",
  benouaich: "/img/benouaich.webp", gane: "/img/gane.webp", imavov: "/img/imavov.webp",
  zebo: "/img/zebo.webp",
  "saint-denis": "/img/saint-denis.webp",
};

// Par sujet, et UNIQUEMENT quand le document n'est pas un portrait.
//
// La faute que ces trois lignes reparent : `portrait-one-championship-tang-kai`
// contient « champion ». Le repli s'appliquait donc a toute la galerie ONE
// Championship, et neuf combattants differents affichaient la meme
// photographie de ceinture. Un repli generique doit etre le dernier recours,
// jamais un filet qui attrape ce qui allait bien.
const SUJETS_MAISON = [
  [/(^|-)(club|gym|academy|salle)(-|$)|(^|-)team-/, "/img/gym.webp"],
  [/(^|-)pesee(-|$)/, "/img/pesee.webp"],
  [/(^|-)classements?(-|$)/, "/img/ceinture.webp"],
  [/(^|-)(organisation|differences)(-|$)/, "/img/organisations.webp"],
  [/(^|-)(calendrier|gala)(-|$)/, "/img/arena-exterieur.webp"],
];

/**
 * L'image d'un document, curatee. Renvoie `null` si rien de mieux que
 * l'image du CMS n'existe — l'appelant garde alors la sienne.
 */
/**
 * La version vignette d'une image, quand elle existe.
 *
 * Une carte de liste affiche son image sur 430 px au plus et recevait
 * l'original — souvent 1 600 px. Le navigateur telechargeait huit fois trop
 * d'octets puis decodait huit fois trop de pixels, sur le fil principal, en
 * plein defilement. `tools/vignettes.mjs` fabrique les versions de 640 px ;
 * cette fonction les sert la ou l'image est petite a l'ecran.
 *
 * Les photos d'ouverture d'article et le heros gardent l'original : ils
 * occupent toute la colonne, parfois tout l'ecran.
 */
export function vignette(url) {
  if (!url || !url.startsWith("/")) return url;
  const nom = url.split("/").pop().replace(/\.[a-z]+$/i, "") + ".webp";
  return existsSync(join(ROOT, "media", "vignettes", nom)) ? "/media/vignettes/" + nom : url;
}

export function imageMaison(slug) {
  const s = String(slug || "").toLowerCase();
  // Un article maison apporte sa propre photo : aucun repli ne s'y applique.
  if (s.startsWith("boxing-center-")) return null;
  // La photo d'une salle est nommee, pas devinee : elle prime sur tout.
  if (PHOTOS_EXACTES[s]) return { url: PHOTOS_EXACTES[s][0], credit: PHOTOS_EXACTES[s][1], unique: true };
  // Le nom retenu est celui qui apparait le PLUS TOT dans le slug, pas le
  // premier de la liste : « dan-hooker-citations-ufc-paris-parnasse » parle
  // de Hooker, et une correspondance par ordre de declaration y mettait la
  // photo de Parnasse. Le sujet d'un article est nomme en tete de son slug.
  let meilleur = null;
  for (const [nom, chemin] of Object.entries(PORTRAITS_MAISON)) {
    // Le nom doit etre un segment du slug, pas une sous-chaine : « sy »
    // apparait dans « physique » et illustrerait n'importe quoi.
    const m = s.match(new RegExp(`(^|-)${nom}(-|$)`));
    if (m && (meilleur === null || m.index < meilleur.index)) meilleur = { index: m.index, chemin };
  }
  if (meilleur) return { url: meilleur.chemin, unique: true };
  // Un portrait garde toujours l'image du CMS : c'est la photo de la personne.
  // Lui appliquer un repli par sujet, c'est remplacer un visage par un objet.
  if (s.startsWith("portrait-")) return null;

  // Les replis par sujet sont generiques par construction : trois articles de
  // classement recevraient la meme ceinture. Ils passent donc au
  // dedoublonnage comme les images du CMS.
  for (const [motif, chemin] of SUJETS_MAISON) if (motif.test(s)) return { url: chemin, unique: false };
  return null;
}

/** Ramène n'importe quelle variante d'URL WordPress vers le fichier local. */
function localMedia(src) {
  if (!src) return null;
  if (mediaByUrl.has(src)) return mediaByUrl.get(src);
  const name = basename(src.split("?")[0]);
  const stem = name.replace(/-\d+x\d+(?=\.[a-z0-9]+$)/i, "").replace(/\.[a-z0-9]+$/i, "");
  if (mediaByUrl.has(stem)) return mediaByUrl.get(stem);
  const scaled = stem.replace(/-scaled$/, "");
  if (mediaByUrl.has(scaled)) return mediaByUrl.get(scaled);
  return null;
}

/* --------------------------------------------------------------- nettoyage */

/**
 * Débarrasse le HTML WordPress de tout ce qui le désigne, et rend les images
 * conformes : chemin local, lazy-loading, dimensions réservées (sans quoi la
 * page saute au chargement — le CLS est un défaut de design, pas un détail).
 */
/** Les mots significatifs d'un texte, sans accents ni mots outils. */
function mots(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z]+/)
    .filter((w) => w.length > 3);
}

/** La fin d'un <div> ouvert, en comptant les imbrications. */
function finDuDiv(html, depuis) {
  let profondeur = 1, i = depuis;
  while (i < html.length && profondeur > 0) {
    const ouvre = html.indexOf("<div", i);
    const ferme = html.indexOf("</div", i);
    if (ferme < 0) return html.length;
    if (ouvre >= 0 && ouvre < ferme) { profondeur++; i = ouvre + 4; }
    else { profondeur--; i = ferme + 5; if (!profondeur) return ferme; }
  }
  return html.length;
}

/**
 * Sortir l'article de son constructeur de pages.
 *
 * Cinquante-et-un articles sur quatre-vingt-douze ne sont pas du HTML
 * d'auteur : ce sont des arbres Elementor, ou le texte n'est pas dans des
 * <p> mais pose nu dans le conteneur d'un widget « text-editor », sous des
 * titres poses dans des widgets « heading », le tout enveloppe dans trente
 * niveaux de <div> de gabarit.
 *
 * Le nettoyeur precedent coupait le corps au premier marqueur du
 * constructeur. Sur ces articles-la, ce marqueur est le septieme caractere :
 * la coupe emportait l'article entier. Ils sont partis en ligne avec un
 * titre, une photo, une signature — et pas une ligne de texte. J'avais
 * verifie le poids des pages et l'absence de traces de CMS ; jamais que le
 * texte avait survecu.
 *
 * On ne coupe donc plus : on extrait. Les widgets porteurs de texte rendent
 * leur contenu dans l'ordre du document, les widgets de gabarit sont
 * ignores, et la grille « De la meme categorie » borne la lecture.
 */
function extraireDuConstructeur(html) {
  const grille = html.search(/wpr-grid|data-overlay-link/);
  const corps = grille > 0 ? html.slice(0, html.lastIndexOf("<", grille)) : html;

  const morceaux = [];
  const re = /data-widget_type="([a-z0-9-]+)\.default"/g;
  let m;
  while ((m = re.exec(corps))) {
    const type = m[1];
    if (type !== "heading" && type !== "text-editor") continue;
    const c = corps.indexOf('class="elementor-widget-container"', m.index);
    if (c < 0) continue;
    const debut = corps.indexOf(">", c) + 1;
    const dedans = corps.slice(debut, finDuDiv(corps, debut)).trim();
    if (!dedans) continue;
    morceaux.push(
      type === "heading" || /^<(p|ul|ol|h[1-6]|blockquote|figure|table)\b/i.test(dedans)
        ? dedans
        : `<p>${dedans}</p>`
    );
  }
  return morceaux.join("\n");
}

/**
 * Retirer un paragraphe de tete qui appartient a une autre fiche.
 *
 * Trois portraits ouvrent sur la phrase d'un autre : celui de Dario Bellandi
 * presente James Webb, celui de Dakota Ditcheva presente Yagshimuradov,
 * celui de Harry Hardwick reprend mot pour mot Samuel Silva. Le champ a ete
 * copie-colle dans le CMS et jamais change.
 *
 * La regle ne devine pas, elle constate : un paragraphe de tete n'est un
 * intrus que s'il ouvre AUSSI une autre fiche. Le copier-coller laisse deux
 * exemplaires identiques, et c'est la seule preuve qu'on accepte.
 *
 * Une premiere version retirait tout paragraphe nommant un autre combattant.
 * Elle allait supprimer du texte juste : la carte d'UFC Paris cite Axel Sola
 * parce qu'il y combat. Un article d'evenement parle forcement de plusieurs
 * personnes ; seul un portrait ne parle que d'une.
 *
 * De la paire, on garde l'exemplaire chez qui le texte nomme le sujet. Quand
 * il n'en nomme aucun, on le retire des deux : perdre une accroche coute
 * moins cher que d'en publier une fausse sur une personne reelle.
 */
const intrusSignales = [];
let _tetes = null;

function tetesDePortraits() {
  if (_tetes) return _tetes;
  _tetes = new Map();
  for (const p of posts) {
    if (!p.slug.startsWith("portrait-")) continue;
    let h = String(p.content?.rendered || "");
    if (/data-elementor-type=/.test(h)) h = extraireDuConstructeur(h);
    const prem = [...h.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((m) => stripTags(m[1]).trim())
      .find((t) => t.length > 40);
    if (!prem) continue;
    if (!_tetes.has(prem)) _tetes.set(prem, []);
    _tetes.get(prem).push(p);
  }
  return _tetes;
}

function retireLesIntrus(html, doc) {
  if (!doc || !doc.slug?.startsWith("portrait-")) return html;
  const table = tetesDePortraits();
  let premierVu = false;

  return html.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (bloc, dedans) => {
    if (premierVu) return bloc;
    const t = stripTags(dedans).trim();
    if (t.length <= 40) return bloc;
    premierVu = true;
    const porteurs = table.get(t);
    if (!porteurs || porteurs.length < 2) return bloc;
    const set = new Set(mots(t));
    // Le texte cite parfois le seul patronyme — « Yagshimuradov s'est
    // impose » — la ou la fiche s'intitule « Dovletdzhan Yagshimuradov ».
    const proprio = porteurs.find((q) => {
      const n = mots(decode(q.title.rendered));
      if (n.length && n.every((w) => set.has(w))) return true;
      const patronyme = n.reduce((a, w) => (w.length > a.length ? w : a), "");
      return patronyme.length >= 5 && set.has(patronyme);
    });
    if (proprio && proprio.id === doc.id) return bloc;
    intrusSignales.push(
      `${decode(doc.title.rendered)} — paragraphe d'ouverture partage avec ${porteurs
        .filter((q) => q.id !== doc.id)
        .map((q) => decode(q.title.rendered))
        .join(", ")}${proprio ? ` (appartient à ${decode(proprio.title.rendered)})` : " (propriétaire indéterminé)"}`
    );
    return "";
  });
}

/** Ce que le build doit dire tout haut : ces fiches sont a corriger au CMS. */
export function intrusDuCorpus() {
  return [...new Set(intrusSignales)];
}

function cleanContent(html, doc) {
  let out = html;

  // 1. Le corps venu du constructeur de pages.
  if (/data-elementor-type=/.test(out)) out = extraireDuConstructeur(out);

  // 1 bis. Le bandeau de fraicheur.
  //
  // Trente-sept fiches portent « Mise a jour 31 aout 2026 — statut titre. »
  // en tete de corps. C'est une information que le lecteur veut — cette
  // ceinture a pu changer de proprietaire — mais posee dans le fil du texte
  // elle se lit comme la premiere phrase de l'article.
  out = out.replace(
    /<p[^>]*>(\s*(?:<strong>)?\s*Mise à jour[\s\S]*?)<\/p>/gi,
    '<p class="maj">$1</p>'
  );

  // 1 ter. Les paragraphes de tete qui appartiennent a une autre fiche.
  out = retireLesIntrus(out, doc);

  // 2. Les grilles « articles lies » du CMS, dans les corps ecrits a la main.
  //
  // Retirer les attributs d'un bloc mort ne le tue pas, ca le camoufle : on
  // coupe la ou la grille commence. Le marqueur du constructeur de pages
  // n'en fait plus partie — c'est lui qui emportait les articles entiers.
  const marqueur = out.search(/wpr-grid|data-overlay-link/);
  if (marqueur > 0) {
    const debut = out.lastIndexOf("<", marqueur);
    if (debut > 0) out = out.slice(0, debut);
  }

  // Images : source locale + attributs de performance.
  out = out.replace(/<img\b([^>]*)>/gi, (tag, attrs) => {
    const src = (attrs.match(/\ssrc="([^"]+)"/i) || [])[1];
    const alt = (attrs.match(/\salt="([^"]*)"/i) || [])[1] || "";
    const found = localMedia(src);
    if (!found) return tag; // image externe : on n'y touche pas
    const w = found.media_details?.width;
    const h = found.media_details?.height;
    const dims = w && h ? ` width="${w}" height="${h}"` : "";
    return `<img src="${found.url}" alt="${esc(alt)}" loading="lazy" decoding="async"${dims} />`;
  });

  // srcset WordPress : inutile une fois l'original servi, et il réintroduit
  // des chemins wp-content. On le supprime plutôt que de le réécrire.
  out = out.replace(/\s(srcset|sizes)="[^"]*"/gi, "");

  // Liens internes : absolus vers le domaine → relatifs à la racine.
  out = out.replace(/href="https?:\/\/(?:www\.)?ufc\.fr\/([^"]*)"/gi, 'href="/$1"');

  // Toute trace résiduelle de l'ancien CMS.
  out = out.replace(/\s(?:class|id)="[^"]*\b(?:wp-|elementor|has-|is-layout)[^"]*"/gi, "");
  out = out.replace(/https?:\/\/(?:www\.)?ufc\.fr\/wp-content\/uploads\//gi, "/media/");
  // Elementor et Royal Addons signent leur passage dans des attributs data-*
  // et des classes wpr-*. On retire les attributs plutôt que les balises : un
  // <div> nu est inerte, alors que supprimer une balise ouvrante sans sa
  // fermante casserait la structure du document.
  out = out.replace(/\sdata-(?:elementor|widget|settings|wpr|id|element_type)[a-z_-]*="[^"]*"/gi, "");
  out = out.replace(/\s(?:class|id)="[^"]*\bwpr-[^"]*"/gi, "");
  out = out.replace(/<div\s*>/gi, "<div>");

  // Restes des grilles dynamiques : leur pagination pointait l'API REST. Le
  // widget ne survit pas a l'extraction, on retire ses debris plutot que de
  // laisser une URL de CMS dans le document.
  out = out.replace(/<a[^>]*href="[^"]*wp-json[^"]*"[^>]*>[\s\S]*?<\/a>/gi, "");
  out = out.replace(/<div[^>]*data-pages="[^"]*"[^>]*>[\s\S]*?<\/div>/gi, "");
  out = out.replace(/<span[^>]*current-page[^>]*>[\s\S]*?<\/span>/gi, "");

  // Le corps venu du CMS porte parfois son propre <h1> : le theme WordPress
  // ne rendait pas de titre au-dessus, l'auteur l'a donc ecrit dans le texte.
  // Notre gabarit fournit le h1, celui du corps est retrograde en h2 — deux
  // h1 sur une page, c'est un signal contradictoire envoye a l'indexation.
  out = out.replace(/<(\/?)h1(\s|>)/gi, "<$1h2$2");

  return out.trim();
}

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Décode les entités que l'API renvoie déjà encodées dans les titres.
 *
 * Les numériques sont traitées par la règle générale plutôt qu'une par une :
 * une table écrite à la main laissait passer tout ce qu'elle n'avait pas
 * prévu — « cage 5&#215;5 » s'affichait tel quel dans une fiche de club.
 * `&amp;` se décode en dernier, sinon « &amp;#215; » deviendrait un ×.
 */
const decode = (s = "") =>
  String(s)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&rsquo;/g, "’").replace(/&lsquo;/g, "‘")
    .replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”")
    .replace(/&hellip;/g, "…").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—")
    .replace(/&laquo;/g, "«").replace(/&raquo;/g, "»")
    .replace(/&nbsp;/g, " ").replace(/&times;/g, "×").replace(/&eacute;/g, "é")
    .replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/**
 * Le resume d'un document.
 *
 * L'extrait fourni par le CMS commence a la premiere ligne du corps — or les
 * articles ouvrent sur une <figure>, donc l'extrait commençait par la
 * legende : « Accor Arena, Paris. Photo Vilacor, Wikimedia Commons, licence
 * CC BY 4.0. » sur chaque carte du fil. Un credit photo n'a jamais donne
 * envie de cliquer. On prend le premier vrai paragraphe.
 */
export function resume(doc, n = 150) {
  /* Le corps nettoye, pas le brut. Tant que le resume lisait le HTML du
   * constructeur de pages, il tombait dans la grille « De la meme
   * categorie » qui ferme chaque fiche : seize portraits se resumaient par
   * leur voisin — celui de Tang Kai parlait de Yuya Wakamatsu, celui de
   * Salahdine Parnasse de Sebastian Przybysz. */
  const corps = String(cleanContent(doc.content?.rendered || "", doc))
    .replace(/<figure[\s\S]*?<\/figure>/gi, "")
    .replace(/<figcaption[\s\S]*?<\/figcaption>/gi, "");
  const paras = [...corps.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => stripTags(m[1]));
  /* Un resume dit de quoi parle l'article. Trois sortes de paragraphes n'en
   * parlent pas, et se trouvaient pourtant en tete :
   *
   * - le bandeau de fraicheur, « Mise a jour 31 aout 2026 — statut titre »,
   *   present sur trente-sept fiches sur quatre-vingt-douze. Il est utile
   *   sur la page, il est vide sur une carte ;
   * - le renvoi de navigation, « Explorez d'autres champions… » ;
   * - le paragraphe trop court, presque toujours une categorie de poids
   *   isolee (« Lightweight ») ou une mention de source.
   *
   * Quarante pour cent du corpus se presentait donc, dans le fil, sur
   * l'accueil et dans la recherche, par un avertissement de maintenance au
   * lieu de son sujet. */
  const SERVICE = /^\s*(mise à jour\b|explorez\b|à lire aussi\b|voir aussi\b|photo\s|crédit\s)/i;
  const utile = paras.filter((t) => t.length > 60 && !SERVICE.test(t));
  const texte = utile[0] || paras.find((t) => t.length > 60) || paras[0] || stripTags(doc.excerpt?.rendered || "");
  if (!texte) return "";
  if (texte.length <= n) return texte;
  const coupe = texte.slice(0, n);
  // On retire la ponctuation de fin avant d'ajouter les points de suspension :
  // couper sur « les... » donnait « les…... » dans les resultats de recherche.
  return coupe.slice(0, coupe.lastIndexOf(" ")).replace(/[\s.,;:…]+$/, "") + "…";
}

/**
 * Le texte d'un fragment HTML, sans ses balises.
 *
 * Chaque balise devient une espace — sinon « <strong>Paris</strong>2026 »
 * donnerait « Paris2026 ». Mais quand la balise fermait juste avant une
 * ponctuation, l'espace reste : « huit Français . » s'affichait ainsi sur les
 * cartes du fil. On recolle le point et la virgule, jamais le deux-points ni
 * le point-virgule, qui gardent leur espace en français.
 */
const stripTags = (s = "") =>
  decode(
    String(s)
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\s+([.,)\]])/g, "$1")
      .replace(/([(\[])\s+/g, "$1")
      // L'elision colle au mot suivant : « l'<strong>UFC</strong> » devenait
      // « l' UFC » des que la balise etait remplacee par une espace.
      .replace(/([a-zà-ÿ])([\u2019'])\s+/gi, "$1$2")
      .trim()
  );

const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
function dateFr(iso) {
  const d = new Date(iso);
  const j = d.getUTCDate();
  return `${j === 1 ? "1er" : j} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Coupe une description à la longueur que Google affiche réellement. */
/* ------------------------------------------------- metadonnees du CMS --
 * Ce que la page dit d'elle-meme aux moteurs.
 *
 * Le CMS fournit un titre et une description SEO par document, et le
 * generateur les recopiait tels quels. Six pages annoncaient donc autre
 * chose qu'elles-memes : la fiche de Tang Kai se presentait sous le surnom
 * d'Oumar Kane, celle d'Aboubakar Younousov decrivait Aboubacar Bathily,
 * celle de Timur Khizriev decrivait Shamil Musaev, celle de Gadzhi
 * Rabadanov decrivait Denis Goltsov. Des champs copies-colles dans le CMS
 * et jamais changes, sur un site dont toute la strategie est le referencement.
 *
 * Une valeur SEO identique sur deux pages n'est juste sur aucune des deux :
 * l'une des deux ment forcement, et on ne sait pas laquelle. Les deux
 * repassent donc par le contenu de leur propre page, qui, lui, ne peut pas
 * se tromper de sujet.
 */
function comptePar(lire) {
  const n = new Map();
  for (const d of [...posts, ...pages]) {
    const v = (lire(d) || "").trim();
    if (v) n.set(v, (n.get(v) || 0) + 1);
  }
  return n;
}
let _tables = null;
function tables() {
  if (!_tables)
    _tables = {
      titre: comptePar((d) => d.yoast_head_json?.title),
      desc: comptePar((d) => d.yoast_head_json?.description),
      extrait: comptePar((d) => stripTags(d.excerpt?.rendered || "")),
    };
  return _tables;
}

/** Une valeur n'appartient a cette page que si aucune autre ne la porte. */
const propre = (table, v) => (v && table.get(v.trim()) === 1 ? v.trim() : "");

function yoastPropre(doc, champ) {
  return propre(champ === "title" ? tables().titre : tables().desc, doc.yoast_head_json?.[champ]);
}

/**
 * La description descend de source en source jusqu'a en trouver une qui
 * n'appartienne qu'a cette page.
 *
 * Sur la fiche de Gadzhi Rabadanov, le CMS portait le texte de Denis Goltsov
 * dans le champ SEO *et* dans l'extrait : ecarter le premier ne suffisait
 * pas. Le corps de l'article, lui, parle bien de Rabadanov — c'est le
 * dernier recours, et le plus sur, parce qu'un corps ne se copie-colle pas
 * d'une fiche a l'autre.
 */
function metaDesc(doc) {
  const raw =
    yoastPropre(doc, "description") ||
    propre(tables().extrait, stripTags(doc.excerpt?.rendered || "")) ||
    resume(doc, 400) ||
    stripTags(doc.content?.rendered || "");
  if (raw.length <= 160) return raw;
  const cut = raw.slice(0, 157);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

/* Un resultat de recherche coupe au-dela de ~65 signes, et la fin d'un titre
 * porte souvent le sujet : « …et devient champion des poids welters ». La
 * marque coute dix signes ; elle est utile quand elle tient, nuisible quand
 * elle fait sauter la fin du titre. On l'ajoute donc seulement si le compte
 * le permet — Google reconstitue le nom du site par ailleurs. */
const LIMITE_TITRE = 65;

/**
 * Raccourcir un titre trop long — a une articulation, jamais au signe pres.
 *
 * Coupe ici, le titre se coupe ou la phrase le permet — avant un « et », un
 * tiret, une virgule — et la proposition qui reste se tient toute seule. Si
 * aucune articulation ne tombe au bon endroit, on rend le titre entier :
 * mieux vaut laisser le moteur trancher que trancher au milieu d'un nom.
 */
const ARTICULATIONS = [" et ", " \u2014 ", " \u2013 ", " - ", ", ", " : "];
function raccourcir(titre) {
  if (titre.length <= LIMITE_TITRE) return titre;
  let meilleur = "";
  for (const sep of ARTICULATIONS) {
    let i = titre.lastIndexOf(sep);
    while (i > 0) {
      const bout = titre.slice(0, sep === " : " ? i + 1 : i).trim().replace(/[,:\u2014\u2013-]$/, "").trim();
      // Une articulation ne sert que si ce qu'elle laisse tient debout : au
      // moins la moitie de la limite, sinon le titre perd son sujet.
      if (bout.length <= LIMITE_TITRE && bout.length >= LIMITE_TITRE / 2 && bout.length > meilleur.length) meilleur = bout;
      i = titre.lastIndexOf(sep, i - 1);
    }
  }
  return meilleur || titre;
}

function avecMarque(titre) {
  const complet = `${titre} | ${BRAND}`;
  if (complet.length <= LIMITE_TITRE) return complet;
  return raccourcir(titre);
}

/**
 * Le titre de l'onglet et du resultat de recherche.
 *
 * Meme garde que la description, plus une seconde : un titre SEO qui ne
 * partage aucun mot significatif avec le titre de la page ne parle pas de
 * cette page. « UFC 315 : Jack Della Maddalena detrone Belal Muhammad »
 * s'annoncait « Hexagone MMA debarque a Toulouse ».
 *
 * Les titres SEO deliberement differents sont preserves : « KSW : Le Colosse
 * du MMA Polonais » pour « Konfrontacja Sztuk Walki » partage KSW, donc il
 * passe. On ne corrige que ce qui n'a aucun lien.
 */
function seoTitle(doc) {
  const vrai = decode(doc.title.rendered);
  const y = yoastPropre(doc, "title");
  if (!y) return avecMarque(vrai);
  const dedans = new Set(mots(vrai));
  const communs = mots(y).filter((m) => dedans.has(m));
  if (!communs.length) return avecMarque(vrai);
  const nu = decode(y).replace(/\s*[|\u2013-]\s*UFC\.FR\s*$/i, "").trim();
  return avecMarque(nu);
}

export { cleanContent, localMedia, esc, decode, stripTags, dateFr, metaDesc, seoTitle, posts, pages, categories, SITE, BRAND, ROOT, mediaManifest };
