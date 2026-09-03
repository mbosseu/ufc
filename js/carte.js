/**
 * L'instrument de défilement de la carte.
 *
 * Le script ne fait que deux choses, et les deux servent la lecture :
 * il dit à quel combat on en est, et il referme l'octogone d'autant.
 * Aucune animation décorative — si on retire ce fichier, la page reste
 * une carte complète et lisible, seulement muette.
 */
(function () {
  "use strict";

  var rail = document.querySelector(".card-rail");
  var line = document.querySelector(".cage-line");
  var count = document.querySelector("[data-cage-now]");
  if (!rail || !line || !count) return;

  var bouts = Array.prototype.slice.call(rail.querySelectorAll(".bout"));
  if (!bouts.length) return;

  var total = bouts.length;
  var current = 0;
  var ticking = false;

  function update() {
    ticking = false;

    // Le combat « courant » est celui dont le haut a franchi le tiers
    // supérieur de la fenêtre : c'est là que l'œil se pose naturellement,
    // et pas au centre géométrique.
    var seuil = window.innerHeight * 0.38;
    var index = 0;
    for (var i = 0; i < total; i++) {
      var box = bouts[i].getBoundingClientRect();
      bouts[i].classList.toggle("near", box.top < window.innerHeight * 0.82 && box.bottom > 0);
      if (box.top <= seuil) index = i;
    }

    if (index !== current) {
      current = index;
      count.textContent = String(index + 1).padStart(2, "0");
    }

    // L'octogone se trace en proportion de la carte parcourue. On part de
    // la première station et non du haut de page : le cadre ne doit pas
    // être déjà entamé avant que le premier combat soit à l'écran.
    var first = bouts[0].getBoundingClientRect().top + window.scrollY;
    var last = bouts[total - 1].getBoundingClientRect().bottom + window.scrollY;
    var span = Math.max(1, last - first - window.innerHeight * 0.4);
    var done = Math.min(1, Math.max(0, (window.scrollY + seuil - first) / span));
    line.style.strokeDashoffset = String(1 - done);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
})();
