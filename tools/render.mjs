/**
 * Gabarits et rendu. Séparé de build.mjs pour que la mise en page reste
 * lisible d'un seul tenant : c'est le fichier qu'on rouvre quand le design
 * bouge, et il ne doit jamais se mélanger à la logique d'extraction.
 *
 * Les chemins sont absolus (/css/site.css) et non relatifs : les pages sont
 * rendues à des profondeurs différentes (/slug/ et /), et un chemin relatif
 * casse dès qu'on déplace un document.
 */
import { esc } from "./build.mjs";

const NAV = [
  ["/", "Accueil"],
  ["/actualite-du-mma/", "Actualités"],
  ["/ufc-paris-2026/", "UFC Paris 2026"],
  ["/resultats/", "Résultats"],
  ["/clubs-mma-francais/", "Clubs"],
  ["/champions-mma-actuels/", "Champions"],
];

// Le tiroir porte l'arborescence complète du cahier des charges §12 — c'est
// lui qui garantit qu'aucune rubrique du WordPress ne disparaît de la
// navigation après la bascule.
const DRAWER = [
  ["/", "Accueil"],
  ["/actualite-du-mma/", "Actualités"],
  ["/resultats/", "Résultats"],
  ["/evenements/", "Événements"],
  ["/ufc-paris-2026/", "UFC Paris 2026"],
  ["/calendrier-mma-france-automne-2026/", "Calendrier MMA France"],
  ["/classements-ufc-aout-2026/", "Classements UFC"],
  ["/combattants/", "Combattants"],
  ["/mma-portraits-de-champions/", "Portraits de champions"],
  ["/organisations/", "Organisations"],
  ["/clubs-mma-francais/", "Clubs de MMA français"],
  ["/champions-mma-actuels/", "Champions actuels"],
  ["/analyses/", "Analyses"],
  ["/interviews/", "Interviews"],
  ["/forum-communaute-mma/", "Forum"],
  ["/recherche/", "Rechercher"],
  ["/a-propos/", "À propos"],
];

const ORGS = [
  ["/organisation-mma-ultimate-fighting-championship/", "UFC"],
  ["/organisation-mma-professional-fighters-league/", "PFL"],
  ["/organisation-mma-one-championship/", "ONE Championship"],
  ["/organisation-mma-cage-warriors/", "Cage Warriors"],
  ["/organisation-mma-ares-fighting-championship/", "ARES"],
  ["/organisation-hexagone-mma/", "Hexagone MMA"],
  ["/organisation-mma-ksw/", "KSW"],
];

/* Les polices sont chez nous. Voir css/polices.css pour le pourquoi : un
 * site d'actualite ne fait pas dependre son texte d'un domaine tiers. */
const POLICES = "/css/polices.css";

/* Les deux fontes du premier ecran : le serif des titres et l'interface.
 * Le reste (l'italique du serif, la police d'affichage) arrive ensuite sans
 * jamais rien bloquer. Precharger les quatre reviendrait a faire la course
 * contre la photo du heros, qui compte davantage. */
const FONTES_CRITIQUES = ["/fonts/newsreader.woff2", "/fonts/outfit.woff2"];

/**
 * La tête de page. Le cahier des charges (§11) et la barre jugent cette
 * couche plus durement que le reste : tout ce qu'un robot — Google ou un
 * moteur de réponse — peut lire se décide ici.
 */
export function head({ title, description, canonical, image, type = "article", schema = [] }) {
  const img = image || "/media/brand/ufc-fr-og.jpg";
  const abs = (u) => (u.startsWith("http") ? u : `https://ufc.fr${u}`);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${abs(canonical)}" />
  <meta property="og:site_name" content="UFC.FR" />
  <meta property="og:locale" content="fr_FR" />
  <meta property="og:type" content="${type}" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${abs(canonical)}" />
  <meta property="og:image" content="${abs(img)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${abs(img)}" />
  <link rel="icon" href="/media/brand/favicon-32.png" sizes="32x32" />
  <link rel="icon" href="/media/brand/favicon-192.png" sizes="192x192" />
  <link rel="apple-touch-icon" href="/media/brand/favicon-192.png" />
  <!-- Les polices ne viennent plus de chez Google.
       Meme chargee sans bloquer le rendu, la feuille distante restait un
       point de rupture : sur un reseau ou fonts.googleapis.com ne repond
       pas, la requete pendait douze secondes puis echouait, et le plus grand
       element de la page etait mesure a quatorze secondes — alors que sa
       photo etait arrivee en une seconde huit.
       Les trois familles sont sous licence SIL Open Font ; les servir
       nous-memes supprime deux resolutions DNS, deux poignees de main TLS,
       une dependance a un tiers, et une requete vers Google depuis le
       navigateur de chaque lecteur. -->
${FONTES_CRITIQUES.map((f) => `  <link rel="preload" as="font" type="font/woff2" href="${f}" crossorigin />`).join("\n")}
  <link rel="stylesheet" href="${POLICES}" />
  <link rel="stylesheet" href="/css/site.css" />
${schema.map((s) => `  <script type="application/ld+json">${JSON.stringify(s)}</script>`).join("\n")}
</head>`;
}

/**
 * En-tête et tiroir. Le tiroir porte enfin un bouton de fermeture : sans lui,
 * l'utilisateur mobile n'a aucun repère pour sortir du menu.
 */
/**
 * @param current  chemin de la page courante, pour marquer l'onglet actif
 * @param corps    classe posee sur <body>. `home` fait passer l'en-tete en
 *                 position fixe pour qu'elle se superpose au heros sombre —
 *                 sans elle, l'en-tete se pose au-dessus du heros sur le fond
 *                 clair de la page, et son texte clair devient invisible.
 */
export function header(current = "", corps = "") {
  const on = (href) => (href === current ? ' class="on"' : "");
  return `<body${corps ? ` class="${corps}"` : ""}>
  <a class="skip" href="#contenu">Aller au contenu</a>
  <header>
    <div class="header-inner">
      <a class="brand" href="/"><img src="/logo/ufc.fr.jpeg" alt="UFC.FR, média MMA indépendant" width="120" height="40" /></a>
      <nav class="main" aria-label="Principale">
${NAV.map(([h, l]) => `        <a${on(h)} href="${h}">${l}</a>`).join("\n")}
      </nav>
      <a class="cta cut" href="/ufc-paris-2026/">Paris 2026</a>
      <button class="burger" type="button" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="menu" data-menu><i></i><i></i><i></i></button>
    </div>
  </header>
  <div class="drawer" id="menu" data-drawer hidden>
    <button class="drawer-close" type="button" aria-label="Fermer le menu" data-close>&times;</button>
    <nav aria-label="Toutes les rubriques">
${DRAWER.map(([h, l]) => `      <a href="${h}">${l}</a>`).join("\n")}
    </nav>
  </div>`;
}

export function footer() {
  return `  <footer class="site">
    <div class="wrap foot" data-reveal>
      <a class="brand" href="/"><img src="/logo/ufc.fr.jpeg" alt="UFC.FR" width="120" height="40" /></a>
      <div class="foot-cols">
        <div>
          <h3>Média</h3>
          <a href="/actualite-du-mma/">Actualités</a>
          <a href="/resultats/">Résultats</a>
          <a href="/analyses/">Analyses</a>
          <a href="/interviews/">Interviews</a>
        </div>
        <div>
          <h3>Dossiers</h3>
          <a href="/ufc-paris-2026/">UFC Paris 2026</a>
          <a href="/calendrier-mma-france-automne-2026/">Calendrier MMA France</a>
          <a href="/classements-ufc-aout-2026/">Classements UFC</a>
          <a href="/mma-portraits-de-champions/">Portraits de champions</a>
        </div>
        <div>
          <h3>Organisations</h3>
${ORGS.slice(0, 5).map(([h, l]) => `          <a href="${h}">${l}</a>`).join("\n")}
        </div>
        <div>
          <h3>France</h3>
          <a href="/clubs-mma-francais/">Clubs de MMA</a>
          <a href="/champions-mma-actuels/">Champions</a>
          <a href="/forum-communaute-mma/">Communauté</a>
        </div>
        <div>
          <h3>Site</h3>
          <a href="/a-propos/">À propos</a>
          <a href="/mentions-legales-confidentialites/">Mentions légales</a>
          <a href="/credits.html">Photos</a>
        </div>
      </div>
    </div>
    <div class="legal">
      <div class="wrap">
        <span>UFC.FR est un média indépendant d’actualité MMA. Il n’est pas affilié à l’Ultimate Fighting Championship.</span>
        <span>© 2026 · <a href="/credits.html">Photos</a></span>
      </div>
    </div>
  </footer>
  <script src="/js/entree.js" defer></script>
  <script src="/js/site.js" defer></script>
  <script src="/js/motion.js" defer></script>
</body>
</html>`;
}

export { NAV, DRAWER, ORGS };
