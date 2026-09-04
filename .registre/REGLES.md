# REGLES — UFC.FR

Lu au début de chaque session. Plafond dur : 25 règles. La barre est le plafond,
ce fichier est le plancher.

## Le plancher : le WordPress en ligne

1. **www.ufc.fr en ligne est le plancher, pas la maquette.** Toute page, rubrique ou
   fonction présente sur le WordPress doit exister dans le site recodé avant bascule.
   Vérifier avant de dire « prêt ».
2. Les 7 pages organisation (UFC, PFL, ONE, Cage Warriors, ARES, Hexagone, KSW) sont
   7 pages, pas une. Les fusionner en une seule est une régression SEO et éditoriale.
3. `mentions-legales-confidentialites` existe en ligne. Elle ne disparaît pas.
4. Rubriques en ligne à conserver : Calendrier MMA France, Classements UFC,
   Portraits de champions, Communauté.
5. Le filtrage par catégorie de l'accueil est une fonction, pas une décoration.

## Éditorial — non négociable (cahier des charges §2, §14, §16.3)

6. Jamais « site officiel de l'UFC ». Média indépendant, disclaimer visible.
7. Aucun résultat, vainqueur ou méthode avant le gong. La page résultats reste un
   gabarit déclaré vide jusqu'à la fin des combats.
8. Rien d'inventé : nom, record, date, horaire, citation, palmarès. Sourcer ou omettre.
9. Neuf Français sur la carte de Paris 2026, pas huit. Corriger partout, XML d'import
   compris.
10. Le lien vers club-mma-toulouse.com est contractuel (CDC §10) et doit rester une
    recommandation éditoriale, jamais un lien posé.

## Technique

11. Une page = un `<h1>`. L'accueil aussi.
12. Toute page publique porte : title < 60 car., meta description unique, canonical,
    Open Graph, favicon, et le schema qui correspond à son type.
13. Les articles portent `NewsArticle` + `BreadcrumbList` + dates lisibles machine.
14. Aucune image sans `loading="lazy"` ni dimensions intrinsèques. WebP quand il existe.
15. Le contenu ne dépend jamais du JS pour être visible. Pas de `js-motion` en dur
    dans le HTML.
16. Pages de travail (audit, redaction, seo-suivi, calendrier-editorial) : `noindex`,
    hors sitemap.
17. Aucun secret dans le dépôt. Les scripts lisent l'environnement, jamais un chemin
    Windows en dur.
18. Photos : licence connue et citée dans credits.html, ou la photo ne sort pas.

## Méthode

19. Statique = pauvre. Une page sans mouvement au scroll n'est pas finie.
20. Mobile porte le même récit que le bureau. Un seul point de rupture n'est pas du
    responsive.
21. Ouvrir la page pour de vrai avant de dire qu'elle marche. Console à zéro.
22. Corriger la classe, pas l'endroit : un défaut trouvé = balayage de tous ses frères.
23. Avant de retirer quoi que ce soit : dire pourquoi, et proposer avant d'agir.
24. La cadence de publication est un livrable (CDC §15). Une solution qui empêche
    l'équipe COM de publier a échoué, même si elle est plus belle.
25. Jamais « fini », jamais « 100 % ». Pourcentage honnête + les écarts.
26. **Avant d'écrire une règle CSS, lire celles qui portent déjà le même
    sélecteur.** Un nom de classe générique ne se réutilise jamais : une
    surface, un préfixe. Et avant tout push touchant au CSS : `npm run
    shots`, puis regarder les images. Un code HTTP à 200 ne dit rien d'une
    mise en page.
27. **Une image qui ne montre pas ce dont l'article parle ne l'illustre pas,
    elle le remplit.** Un repli générique est acceptable pour un article
    isolé, jamais pour deux articles voisins dans une même grille. Avant de
    construire une grille : compter les images distinctes qu'elle contient.
    Et une photo prise sur le site de quelqu'un d'autre se crédite —
    toujours, sans exception.
28. **Jamais de propriété raccourcie sur un sélecteur déjà servi ailleurs.**
    `margin: 0 0 34px` écrase les quatre côtés, dont celui qu'une autre règle
    tenait pour une raison. Écrire le côté qu'on change. Et quand une valeur
    trahit une intention (`calc((100% - 100vw) / 2)` ne s'écrit pas par
    hasard), vérifier à l'écran qu'elle produit encore quelque chose : une
    règle morte ne lève aucune erreur, elle ne fait simplement plus rien.
29. **Une suppression se mesure à ce qui reste, jamais à ce qui part.** Un
    nettoyeur qui fait passer une page de 24 à 12 Ko n'a rien prouvé : il a
    peut-être retiré le gabarit, il a peut-être retiré l'article. Après tout
    filtre sur du contenu, compter les signes de texte qui survivent et
    refuser zéro. C'est la faute qui a mis 55 % du corpus en ligne sans une
    ligne de texte, en croyant l'avoir allégé.
30. **Jamais `git checkout .` ni `git restore .` sans chemin.** Pour tester
    une régression, copier le fichier (`cp x x.bak`), pas manipuler l'index.
    Et commiter dès qu'un ensemble cohérent passe le contrôle : un travail
    non commité n'existe pas.
31. **Une dépendance externe a plusieurs portes d'entrée.** Le `<head>`, les
    feuilles importées, les `url()` dans le CSS, les gabarits hérités. En
    corriger une et s'en féliciter, c'est n'avoir rien corrigé : chercher
    toutes les occurrences du domaine avant de déclarer la chose réglée.
32. **Mesurer sur un téléphone bridé, pas sur le réseau local.** Une capture
    d'écran ne dit rien du poids : tout arrive en trente millisecondes en
    local. LCP et CLS se mesurent en 4G bridée avec le processeur divisé par
    quatre, sinon on ne mesure rien. Et l'image du plus grand élément de
    l'écran n'est jamais en `loading="lazy"`.
33. **Une mesure hors contexte n'est pas une vérification.** La largeur d'une
    espace fine mesurée à 40 px ne dit rien de son rendu à 17 px, où elle
    devient invisible. Mesurer à la taille, dans la police et sur le fond où
    la chose est réellement composée — puis regarder l'écran.
34. **Ne jamais réécrire le défilement du navigateur.** Aucune interpolation
    maison ne bat l'inertie que le système calcule : il connaît la vitesse du
    geste, le matériel, les réglages d'accessibilité. Si un effet doit suivre
    le défilement, c'est `animation-timeline: scroll()` — sur le compositeur,
    pas sur le fil principal. Et se mesurer : combien de pixels la page
    parcourt-elle pour vingt crans de molette ?
35. **Le mouvement se paie en trames.** Une transition sur `clip-path`,
    `filter`, `width` ou `height` repeint l'élément à chaque trame ; seuls
    `transform` et `opacity` passent par le compositeur. Et un effet posé sur
    quatre-vingt-douze éléments n'informe plus, il décore — le compter avant
    de le poser.
36. **Un outil de mesure mesure ce qu'on lui a demandé, pas ce qui manque.**
    Le relevé des bandes horizontales vides donnait 1 % sur les pages
    d'article — et le tiers droit de chacune était vide sur toute sa hauteur,
    640 px sur 163 pages. Une page sans bande vide peut être vide. Avant de
    conclure d'un chiffre, se demander ce que l'outil ne peut pas voir, et
    regarder la page.
37. **Une déclaration posée à plat après une requête de largeur la
    remplace.** `@media (max-width: 900px)` puis, plus bas, la même propriété
    sans requête : le téléphone reçoit la valeur du bureau. Toute règle
    ajoutée en fin de feuille doit être enfermée dans sa requête, ou vérifiée
    aux deux largeurs — la vérifier à une seule ne vérifie rien.
38. **Une réservation qui arrive après la sélection ne réserve rien.** La
    photo de la une était marquée « prise » au rendu, c'est-à-dire après le
    choix des cartes : elles croyaient libre une image qu'elles allaient
    perdre, et l'une sortait avec la photo du héros. Réserver d'abord,
    choisir ensuite.
39. **Le plus grand élément de l'écran ne porte jamais d'animation
    d'entrée.** `data-reveal` pose `opacity: 0` jusqu'à ce que le script
    tourne : l'image que Google chronomètre devient invisible pendant une
    seconde et demie, pour un effet qui joue avant le premier défilement et
    que personne ne voit. Mesuré trois fois dans la même soirée — figure
    d'article, fiche de combattant, bloc de une. Photo d'ouverture : jamais
    de `data-reveal`, jamais de `loading="lazy"`.
40. **Une grille à deux colonnes plus un élément placé en colonne 3 fait
    trois pistes, dont une implicite.** Et `grid-column: 2 / -1` compte les
    lignes de la grille *explicite* : l'élément ne couvre alors qu'une seule
    colonne. La photo d'un portrait est sortie en vignette de vingt-neuf
    pixels pour cette raison. Quand une règle change `grid-template-columns`
    sous condition, vérifier tout ce qui se place dans cette grille.
