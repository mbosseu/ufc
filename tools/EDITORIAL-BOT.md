# Bot éditorial UFC.FR

L'entrée historique `UFC/contenus-a-publier/veille_mma.py` appelle désormais
`tools/editorial_bot.py`. Aucun appel WordPress n'est effectué.

## Configuration locale

La configuration est dans `.env.local`, exclue de Git ET de Vercel.
Ne jamais placer de clé dans le code, les notes, les captures ou un commit.
La clé d’entreprise actuelle est conservée conformément au choix de l’éditeur.
Variables : `OPENAI_API_KEY`, `IA_MODEL=gpt-6-luna`,
`IMAGE_MODEL=gpt-image-2`. Aucun changement automatique de modèle si l'accès échoue.
Le modèle texte est aussi utilisé pour les vérifications visuelles ; le modèle
image compose l'affiche à partir des deux portraits via l'API d'édition d'images.

Prérequis : Python 3.11+ avec les fuseaux IANA (`pip install tzdata` si nécessaire),
Node 18+, Git authentifié et Playwright avec Chromium ou Chrome.
Le navigateur fourni par Codex est détecté sur cette machine. Ailleurs, installer
Playwright et son navigateur, ou définir `PLAYWRIGHT_MODULE` et `CHROME_PATH`.

```powershell
python tools/editorial_bot.py --doctor --api-check
python tools/editorial_bot.py
python tools/editorial_bot.py --topic "Une affiche récente à traiter"
python tools/editorial_bot.py --publish
```

Sans `--publish`, tout est préparé dans `.research/editorial-bot/<exécution>/site`
et le site de travail reste inchangé. Un lancement prépare au maximum un article
et une affiche. Les appels texte, recherche, vision et image consomment le quota API.
Ce script ne crée pas de tâche planifiée et ne lance aucune boucle permanente.

## Étapes et conditions de réussite

1. Recherche web d'une actualité publiée depuis au plus sept jours, sur les
   domaines officiels UFC, PFL, ONE, KSW, Hexagone et ARES. Sujet proposé comparé
   au catalogue historique et aux articles JSON locaux. Un bilan après combat
   est un angle distinct d'un avant-combat ; deux bilans du même duel sont refusés.
2. Téléchargement des sources officielles, vérification que les extraits de preuve
   existent réellement, puis seconde lecture IA du dossier. Aucun résultat futur.
   Horaires calculés en `Europe/Paris` depuis un horaire avec décalage UTC prouvé,
   y compris aux changements d'heure. Pas de diffuseur français supposé.
3. Recherche de deux photos publiques propres, en privilégiant les portraits
   officiels et, si disponibles, les images libres. Leur absence de licence libre
   n’empêche pas leur utilisation comme références pour une transformation
   éditoriale, selon le choix de l’éditeur. Les images doivent être nettes, sans
   filigrane, avec les bonnes identités. La page d’origine et l’URL du fichier
   sont conservées dans les notes privées. Les droits ne sont jamais déclarés
   établis sur la seule affirmation du modèle. La transformation n’accorde pas
   de licence sur les photos sources. Aucun lien sortant n’est ajouté au post.
4. Création d'une affiche noire, rouge et blanche à partir des portraits,
   visages conservés, noms, date, lieu, mention « Illustration éditoriale —
   visuel non officiel ». Contrôle de l'affiche par vision, sans réparation
   illimitée ni nouvelle génération automatique en cas d'échec.
5. Rédaction originale, faits distingués des analyses, métadonnées et HTML
   autorisé. Deux liens internes vérifiés au minimum ; aucune URL externe,
   aucun script, aucun champ HTML arbitraire. Nouvelle relecture factuelle.
6. Copie isolée du site, ajout du JSON et du média, construction complète,
   `tools/check.mjs`. Les sources, réponses API, droits, prompts et journaux
   restent dans `.research`, jamais dans les champs publics de l'article.
7. Navigateur réel en 1440 px et 390 px : accueil et article. Mesure des
   proportions, du chargement, du débordement, du recouvrement et du cadrage.
   Captures puis vérification par vision. Toutes les affiches nommées
   `*-affiche.png` bénéficient du CSS : image entière, titre et résumé séparés.
8. Avec `--publish`, le dépôt doit être propre sur `main`, synchronisé avec
   `origin/main`, sans commit local non poussé. Seuls le JSON et le nouveau média
   sont ajoutés au commit. Vercel reconstruit les pages, listes, recherche et
   sitemap depuis les sources. Aucun `git add .`, force-push ou écrasement.
9. Après le push : vérification du titre, de l'image exacte (SHA-256), de
   l'accueil et du sitemap publics ; nouvelle vérification géométrique du site
   déployé. En cas de délai, le push reste enregistré mais le déploiement n'est
   pas déclaré réussi. Relancer uniquement la vérification :

```powershell
python tools/editorial_bot.py --verify-live .research/editorial-bot/DOSSIER
```

Un push refusé conserve le commit local. Corriger l'authentification puis utiliser
`git push origin main`, et `--verify-live` ; ne pas créer un deuxième article.
Le verrou `run.lock` empêche deux exécutions simultanées. Après un arrêt brutal,
vérifier qu'aucun bot ne tourne avant de supprimer ce verrou.

## Tests sans frais API

```powershell
python -m unittest discover -s tools -p test_editorial_bot.py -v
node tools/editorial_visual_check.mjs . ufc-edmonton-buckley-malott-17-octobre-2026 .research/editorial-bot/qa
npm run check
```

Documentation API utilisée : Responses + web_search et Images edits.
https://developers.openai.com/api/docs/guides/tools-web-search
https://developers.openai.com/api/docs/guides/image-generation

En cas de rejet factuel du sujet, une correction des champs depuis les sources
est suivie d’une seconde vérification. La date de publication de la source reste
distincte de la date locale du combat. Un sujet toujours refusé est enregistré
dans les diagnostics, puis la recherche passe à un autre sujet (trois maximum).
Les fenêtres éditoriales sont contrôlées à nouveau après correction.
