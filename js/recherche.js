/**
 * Recherche cote navigateur.
 *
 * L'index est charge une fois, a la premiere frappe et non au chargement de
 * la page : quelqu'un qui arrive sur /recherche/ depuis un lien ne cherche
 * pas forcement, et lui faire telecharger l'index avant qu'il tape serait le
 * faire payer pour rien.
 *
 * Le classement est volontairement simple et explicable : le titre pese plus
 * que le resume, le resume plus que le corps, et la fraicheur departage a
 * egalite. Sur 106 documents, tout le reste serait de la complexite sans
 * gain mesurable.
 */
(function () {
  "use strict";

  var champ = document.getElementById("q");
  var sortie = document.querySelector("[data-resultats]");
  var etat = document.querySelector("[data-etat]");
  if (!champ || !sortie) return;

  var index = null;
  var chargement = null;

  function charger() {
    if (index) return Promise.resolve(index);
    if (!chargement) {
      chargement = fetch("/recherche-index.json")
        .then(function (r) { return r.json(); })
        .then(function (d) { index = d; return d; })
        .catch(function () {
          etat.textContent = "L’index n’a pas pu être chargé. Rechargez la page.";
          return [];
        });
    }
    return chargement;
  }

  /** Accents retires : « pesee » doit trouver « pesée ». */
  function plat(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function chercher(q) {
    var mots = plat(q).split(/\s+/).filter(function (m) { return m.length > 1; });
    if (!mots.length) return [];

    return index
      .map(function (doc) {
        var titre = plat(doc.t);
        var resume = plat(doc.r);
        var corps = plat(doc.k);
        var score = 0;
        for (var i = 0; i < mots.length; i++) {
          var m = mots[i];
          // Un mot absent partout disqualifie : chercher deux mots doit
          // ramener les documents qui portent les deux, pas l'un ou l'autre.
          if (titre.indexOf(m) === -1 && resume.indexOf(m) === -1 && corps.indexOf(m) === -1) return null;
          if (titre.indexOf(m) !== -1) score += 12;
          if (plat(doc.u).indexOf(m) !== -1) score += 6;
          if (resume.indexOf(m) !== -1) score += 3;
          score += Math.min(corps.split(m).length - 1, 5);
        }
        return { doc: doc, score: score };
      })
      .filter(Boolean)
      .sort(function (a, b) { return b.score - a.score || (a.doc.d < b.doc.d ? 1 : -1); })
      .slice(0, 40);
  }

  function echapper(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function rendre(res, q) {
    if (!q.trim()) { sortie.innerHTML = ""; etat.textContent = ""; return; }
    if (!res.length) {
      sortie.innerHTML = "";
      etat.textContent = "Rien pour « " + q + " ». Essayez un nom seul, ou une ville.";
      return;
    }
    etat.textContent = res.length + (res.length > 1 ? " résultats" : " résultat");
    sortie.innerHTML = res
      .map(function (r) {
        var d = r.doc;
        return (
          '<a class="resultat" href="' + d.u + '">' +
          (d.c.length ? '<span class="kicker">' + echapper(d.c[0]) + "</span>" : "") +
          "<h2>" + echapper(d.t) + "</h2>" +
          "<p>" + echapper(d.r) + "…</p>" +
          '<time datetime="' + d.d + '">' + d.d.split("-").reverse().join("/") + "</time>" +
          "</a>"
        );
      })
      .join("");
  }

  var minuteur = null;
  champ.addEventListener("input", function () {
    var q = champ.value;
    window.clearTimeout(minuteur);
    // 120 ms : assez pour ne pas recalculer a chaque touche, trop court pour
    // que la frappe paraisse en retard.
    minuteur = window.setTimeout(function () {
      if (!q.trim()) { rendre([], q); return; }
      etat.textContent = "Recherche…";
      charger().then(function () { rendre(chercher(q), q); });
    }, 120);
  });

  // Une requete passee dans l'URL (?q=parnasse) est executee au chargement :
  // c'est ce qui rend un resultat de recherche partageable.
  var initiale = new URLSearchParams(location.search).get("q");
  if (initiale) {
    champ.value = initiale;
    charger().then(function () { rendre(chercher(initiale), initiale); });
  }
})();
