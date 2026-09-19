/**
 * Le mouvement du site.
 *
 * Trois regles, et elles expliquent tout le fichier :
 *
 * 1. Le contenu est visible par defaut. L'etat masque n'est pose que si ce
 *    script s'execute — d'ou la classe posee sur <html> a la premiere ligne.
 *    JavaScript coupe, erreur, navigateur ancien : la page reste lisible.
 *    C'est l'inverse exact du bug qu'on a retire de ce projet.
 *
 * 2. Le mouvement informe, il ne decore pas. Un bloc se decouvre parce que la
 *    lecture descend ; deux combattants s'ecartent parce que la soiree
 *    commence ; un compteur monte parce que le nombre est l'argument. Rien
 *    ne bouge sans dire quelque chose.
 *
 * 3. Zero dependance. Ce que GSAP faisait ici tenait en deux requetes CDN par
 *    page — une page d'actualite lue en 4G n'a pas les moyens de ce luxe.
 */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // En mouvement reduit ou sans observateur, on ne pose jamais l'etat
  // masque : la page s'affiche telle quelle, integralement.
  if (reduit || !("IntersectionObserver" in window)) return;

  root.classList.add("motion");

  /* ------------------------------------------------------------ decouvertes
   * Les blocs ne s'estompent pas : ils se decouvrent. Un fondu dit « ceci
   * apparait » ; un devoilement par le bas dit « ceci etait la, tu y
   * arrives » — ce qui est vrai d'un article qu'on fait defiler.
   */
  var cibles = document.querySelectorAll("[data-reveal]");
  if (cibles.length) {
    var io = new IntersectionObserver(
      function (entrees) {
        entrees.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;

          // Le decalage se calcule sur les freres deja passes, pas sur un
          // index fige : un article a un nombre de blocs variable, et une
          // cascade codee en dur produirait deux secondes d'attente en bas
          // de page.
          var freres = el.parentElement ? el.parentElement.children : [];
          var rang = 0;
          for (var i = 0; i < freres.length && freres[i] !== el; i++) {
            if (freres[i].hasAttribute && freres[i].hasAttribute("data-reveal")) rang++;
          }
          el.style.transitionDelay = Math.min(rang, 4) * 65 + "ms";
          el.classList.add("shown");
          io.unobserve(el);
        });
      },
      // On declenche avant l'entree reelle : le bloc doit finir son mouvement
      // au moment ou l'oeil arrive dessus, pas le commencer a ce moment-la.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 }
    );
    cibles.forEach(function (el) { io.observe(el); });

    // Filet : un bloc jamais observe (onglet en arriere-plan au chargement,
    // rendu differe) redevient visible au bout de trois secondes. Une page
    // qui garde du texte invisible est cassee, quelle qu'en soit la raison.
    window.setTimeout(function () {
      document.querySelectorAll("[data-reveal]:not(.shown)").forEach(function (el) {
        el.classList.add("shown");
      });
    }, 3000);
  }

  /* --------------------------------------------------------------- compteurs
   * Le corpus est l'argument de ce site : 90 articles, 44 portraits, 14
   * clubs. Un nombre pose est une donnee ; un nombre qui monte est une
   * demonstration. On ne l'anime qu'une fois, et jamais plus d'une seconde.
   */
  var compteurs = document.querySelectorAll("[data-compte]");
  if (compteurs.length) {
    var ioc = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        ioc.unobserve(el);
        var cible = parseInt(el.getAttribute("data-compte"), 10);
        if (!cible) return;
        var debut = performance.now();
        var duree = 900;
        (function pas(t) {
          var p = Math.min(1, (t - debut) / duree);
          // Sortie cubique : la montee ralentit en arrivant, comme un
          // compteur mecanique qui se cale.
          el.textContent = Math.round(cible * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(pas);
        })(debut);
      });
    }, { threshold: 0.6 });
    compteurs.forEach(function (el) { ioc.observe(el); });
  }

  /* ------------------------------------------------------------------ heros
   * L'ouverture du duel et la profondeur des images d'ouverture etaient
   * calculees ici, dans deux ecouteurs de defilement qui lisaient la
   * geometrie (`getBoundingClientRect`) puis ecrivaient un `transform` a
   * chaque trame. C'est le schema qui force le navigateur a recalculer la
   * mise en page en plein defilement, et c'est ce qui donnait des images
   * « qui bougent bizarrement ».
   *
   * Les deux sont passes en CSS, sur la ligne de temps du defilement
   * (`animation-timeline: scroll()`), ou le compositeur les anime sans
   * repasser par le fil principal. La ou la propriete n'existe pas encore,
   * rien ne bouge — un heros immobile est une mise en page, un heros
   * saccade est un defaut.
   *
   * Il ne reste donc aucun ecouteur de defilement dans ce fichier.
   */

})();

/**
 * Le compte a rebours du heros.
 *
 * Calcule dans le navigateur et non au build : une valeur figee serait
 * fausse des la minute suivante, et une page mise en cache afficherait un
 * delai perime. Le serveur donne la date, le navigateur donne l'heure.
 */
(function () {
  "use strict";
  var el = document.querySelector("[data-countdown]");
  if (!el) return;

  var cible = new Date(el.getAttribute("data-countdown")).getTime();
  if (isNaN(cible)) return;

  function ecrire() {
    var reste = cible - Date.now();
    // Trois heures apres le debut annonce : la soiree est finie.
    if (reste <= -3 * 36e5) { el.textContent = "Terminé"; return true; }
    if (reste <= 0) { el.textContent = "En cours"; return true; }
    var h = Math.floor(reste / 36e5);
    var j = Math.floor(h / 24);
    // Au-dela de deux jours on parle en jours : « 71h » avant un evenement
    // dans trois jours est exact et illisible.
    el.textContent = j >= 2 ? "J−" + j : h + "h" + String(Math.floor((reste % 36e5) / 6e4)).padStart(2, "0");
    return false;
  }

  if (!ecrire()) window.setInterval(ecrire, 30000);
})();
