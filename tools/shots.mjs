/**
 * Captures de controle.
 *
 * Ce fichier existe a cause d'une faute precise : une soiree entiere de
 * travail livree en verifiant des codes HTTP et des `grep`, sans jamais
 * ouvrir une page. Le site est parti en production avec un heros dont les
 * deux noms se chevauchaient, des cartes dont le titre tenait sur 102 px,
 * et un cadre decoratif qui recouvrait le heros d'un panneau noir. Aucun de
 * ces defauts n'etait detectable autrement qu'en regardant.
 *
 * `npm run shots` rend chaque type de page en bureau et en telephone, releve
 * les erreurs de console, et ecrit les images dans .research/shots/ (dossier
 * ignore par git). A lancer avant tout push qui touche au CSS.
 */
import { chromium } from "playwright-core";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, ".research", "shots");
const BASE = process.env.BASE || "http://127.0.0.1:4321";

// Un exemplaire de chaque type de page. Une regression touche un type entier :
// verifier trois articles du meme visage n'apprend rien de plus qu'un seul.
const CIBLES = [
  ["accueil", "/", 0],
  ["accueil-defile", "/", 1400],
  ["accueil-salles", "/", ".salles"],
  ["carte", "/carte/ufc-paris-2026/", 1500],
  ["fil", "/actualite-du-mma/", 300],
  ["rubrique", "/categorie/ufc/", 300],
  ["portrait", "/portrait-ufc-john-jones/", 0],
  ["lieu", "/cage-fight-toulouse-club-mma/", 0],
  ["titre-long", "/ufc-315-jack-della-maddalena-detrone-belal-muhammad-et-devient-champion-des-poids-welters/", 0],
  ["maison", "/boxing-center-toulouse-etats-unis/", 700],
  ["maison-bas", "/boxing-center-toulouse-etats-unis/", 2400],
  ["clubs", "/clubs-mma-francais/", 900],
  ["clubs-bas", "/clubs-mma-francais/", 2600],
  ["organisation", "/organisation-mma-ksw/", 1400],
];

mkdirSync(OUT, { recursive: true });
const navigateurs = [
  process.env.CHROME,
  process.env.ProgramFiles && join(process.env.ProgramFiles, "Google", "Chrome", "Application", "chrome.exe"),
  process.env["ProgramFiles(x86)"] && join(process.env["ProgramFiles(x86)"], "Google", "Chrome", "Application", "chrome.exe"),
  process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
  process.env.ProgramFiles && join(process.env.ProgramFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
  "/opt/pw-browsers/chromium",
].filter(Boolean);
const executablePath = navigateurs.find((fichier) => existsSync(fichier));
if (!executablePath) throw new Error("Chrome, Edge ou Chromium est introuvable. Definir CHROME avec le chemin de l'executable.");
const b = await chromium.launch({ executablePath });
let defauts = 0;

for (const [nom, url, scroll] of CIBLES) {
  for (const [tag, vp] of [["bureau", { width: 1440, height: 900 }], ["tel", { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on("pageerror", (e) => erreurs.push(e.message.slice(0, 120)));
    // Le message d'une requete echouee ne porte pas l'URL : il faut la lire
    // dans sa localisation. Les polices distantes sont filtrees parce qu'un
    // reseau restreint les bloque sans que le site soit en cause.
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      const source = m.location()?.url || "";
      if (/fonts\.(googleapis|gstatic)\.com/.test(source)) return;
      erreurs.push(m.text().slice(0, 120) + (source ? ` (${source.slice(-48)})` : ""));
    });
    page.on("requestfailed", (r) => {
      if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) return;
      erreurs.push("requete echouee " + r.url().slice(-56));
    });

    await page.goto(BASE + url, { waitUntil: "domcontentloaded", timeout: 40000 });
    // Un nombre defile de tant de pixels ; une chaine amene la section nommee
    // en haut de l'ecran. Viser la section par son nom evite de rechercher un
    // pixel a chaque fois que la page au-dessus change de hauteur.
    if (scroll) {
      await page.evaluate((cible) => {
        if (typeof cible === "number") return window.scrollTo(0, cible);
        const el = document.querySelector(cible);
        if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 8);
      }, scroll);
      await page.waitForTimeout(1300);
    }
    await page.waitForTimeout(900);

    // Un debordement horizontal est toujours un defaut : il n'existe aucune
    // raison valable qu'une page d'actualite defile lateralement.
    const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (deborde) { erreurs.push("debordement horizontal"); }

    await page.screenshot({ path: join(OUT, `${nom}-${tag}.png`) });
    if (erreurs.length) { defauts++; console.log(`  ✗ ${nom}/${tag} — ${erreurs.join(" | ")}`); }
    else console.log(`  ✓ ${nom}/${tag}`);
    await ctx.close();
  }
}
await b.close();
console.log(defauts ? `\n${defauts} page(s) a regarder dans .research/shots/` : "\nAucune erreur. Les images restent a regarder : la console propre ne dit rien de la mise en page.");
