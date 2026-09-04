/**
 * Pages écrites à la main → URL qui fait foi.
 *
 * Une seule table, lue par le dédoublonnage, le serveur local et les
 * redirections de production. La dupliquer, c'est garantir qu'un jour
 * Vercel enverra ailleurs que le site local.
 */
export const CANONIQUES = {
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
  "organisations.html": "/organisations/",
  "ufc-paris-2026.html": "/ufc-paris-2026-date-lieu-carte-enjeux/",
  "ufc-paris-2026-live.html": "/carte/ufc-paris-2026/",
  "seo-suivi.html": "/suivi-seo/",

  "articles/ufc-paris-2026-presentation.html": "/ufc-paris-2026-date-lieu-carte-enjeux/",
  "articles/ufc-paris-2026-carte.html": "/ufc-paris-2026-carte-complete-hooker-parnasse/",
  "articles/ufc-paris-2026-combattants-francais.html": "/ufc-paris-2026-combattants-francais/",
  "articles/ufc-paris-historique.html": "/ufc-paris-historique-accor-arena/",
  "articles/salahdine-parnasse-debuts-ufc.html": "/salahdine-parnasse-debuts-ufc-paris-2026/",
  "articles/hooker-citations.html": "/dan-hooker-citations-ufc-paris-parnasse/",
  "articles/wood-santos-forfait.html": "/ufc-paris-santos-forfait-wood/",
  "articles/gane-retour-entrainement.html": "/ciryl-gane-retour-entrainement-aspinall/",
  "articles/mma-france-guide.html": "/calendrier-mma-france-automne-2026/",
  "articles/ufc-paris-2026-resultats.html": "/carte/ufc-paris-2026/",
  "articles/ufc-paris-2026-pesee.html": "/ufc-paris-2026-date-lieu-carte-enjeux/",
  "articles/ufc-paris-2026-bilan-francais.html": "/ufc-paris-2026-combattants-francais/",
  "articles/mma-cest-quoi.html": "/categories-poids-mma-guide/",
  "articles/analyse-hooker-parnasse.html": "/ufc-paris-2026-carte-complete-hooker-parnasse/",
  "clubs/cage-fight-toulouse.html": "/cage-fight-toulouse-club-mma/",
};

/**
 * Raccourcis de navigation qui n'ont jamais été générés. Le menu et le pied
 * pointaient `/resultats/` alors que la rubrique vit sous `/categorie/resultats/`.
 * Sans ces 301, chaque clic depuis l'en-tête tombait sur une 404.
 */
export const ALIAS = {
  "/resultats/": "/categorie/resultats/",
  "/evenements/": "/categorie/evenements/",
  "/combattants/": "/categorie/combattants/",
  "/analyses/": "/categorie/analyses/",
  "/interviews/": "/categorie/interviews/",
  "/ufc-paris-2026/": "/categorie/ufc-paris-2026/",
  "/forum/": "/forum-communaute-mma/",
  "/champions/": "/champions-mma-actuels/",
  "/clubs/": "/clubs-mma-francais/",
};

export const REDIRECTS = [
  ...Object.entries(CANONIQUES).map(([source, destination]) => ({
    source: "/" + source.replace(/\\/g, "/"),
    destination,
    permanent: true,
  })),
  ...Object.entries(ALIAS).map(([source, destination]) => ({
    source,
    destination,
    permanent: true,
  })),
];
