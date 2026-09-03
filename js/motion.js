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
   * Le duel s'ouvre au defilement : les deux combattants s'ecartent et la
   * couture s'ouvre sur le noir. Ce n'est pas un effet — c'est le geste du
   * debut de soiree, et il ne se declenche que quand on quitte le heros.
   *
   * Fait en JS plutot qu'en `animation-timeline` CSS parce que le support de
   * scroll() n'est pas encore acquis partout, et qu'un heros immobile chez
   * un visiteur sur deux serait pire que pas d'effet du tout.
   */
  var heros = document.querySelector(".hero-cage");
  if (heros) {
    var gauche = heros.querySelector(".hero-man.a");
    var droite = heros.querySelector(".hero-man.b");
    var couture = heros.querySelector(".hero-vs");
    var enAttente = false;

    function ecarter() {
      enAttente = false;
      var h = heros.offsetHeight || 1;
      // Progression de 0 a 1 sur la premiere hauteur de heros. Au-dela, on
      // arrete de calculer : le heros est hors champ.
      var p = Math.min(1, Math.max(0, window.scrollY / h));
      if (p > 0.999) return;
      var d = p * 7; // pourcentage d'ecartement, volontairement discret
      if (gauche) gauche.style.transform = "translate3d(-" + d + "%,0,0)";
      if (droite) droite.style.transform = "translate3d(" + d + "%,0,0)";
      if (couture) {
        couture.style.opacity = String(1 - p * 1.6);
        couture.style.transform = "translate(-50%,-50%) scale(" + (1 - p * 0.12) + ")";
      }
    }

    window.addEventListener("scroll", function () {
      if (enAttente) return;
      enAttente = true;
      requestAnimationFrame(ecarter);
    }, { passive: true });
    ecarter();
  }

  /* ------------------------------------------------------------- profondeur
   * Les images d'ouverture se deplacent moins vite que le texte. Le decalage
   * est faible — 6 % de la hauteur — parce qu'un parallaxe qu'on remarque
   * est un parallaxe rate : il doit se sentir, pas se voir.
   */
  var profondes = document.querySelectorAll("[data-profondeur] img");
  if (profondes.length) {
    var attenteP = false;
    function deplacer() {
      attenteP = false;
      profondes.forEach(function (img) {
        var cadre = img.parentElement.getBoundingClientRect();
        if (cadre.bottom < 0 || cadre.top > window.innerHeight) return;
        var centre = (cadre.top + cadre.height / 2 - window.innerHeight / 2) / window.innerHeight;
        img.style.transform = "translate3d(0," + (-centre * 6).toFixed(2) + "%,0) scale(1.08)";
      });
    }
    window.addEventListener("scroll", function () {
      if (attenteP) return;
      attenteP = true;
      requestAnimationFrame(deplacer);
    }, { passive: true });
    deplacer();
  }
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
