# Publication autonome UFC.fr

## Horaire et environnement

Le workflow `.github/workflows/editorial-bot.yml` est exécuté chaque jour
à **9 h, Europe/Paris**, avec les changements d’heure gérés par GitHub.
GitHub peut démarrer le travail avec du retard en période de charge.
Il publie au maximum un article par passage, si toutes les étapes réussissent.
Chaque exécution dispose d’un runner Ubuntu neuf, d’une copie propre de `main`,
de Node, Python et Chromium. Le PC personnel peut rester éteint.
Sur un dépôt public, GitHub peut désactiver la programmation après 60 jours
sans activité ; vérifier le tableau Actions si le bot ne publie plus.

L’accès GitHub utilise le jeton temporaire de l’exécution, avec seulement les
permissions nécessaires au contenu et aux alertes Issues. La clé OpenAI est
conservée dans le secret Actions `OPENAI_API_KEY`. Elle n’est pas dans le dépôt.
Les modèles restent `gpt-6-luna` et `gpt-image-2`.

## Tableau de suivi

https://github.com/mbosseu/ufc/actions/workflows/editorial-bot.yml

Le bouton **Run workflow** propose :

- `check` : tests, navigateur et accès API, sans création ni publication ;
- `prepare` : pipeline complet dans le runner sans push ;
- `publish` : pipeline complet et publication après vérification.

La programmation quotidienne utilise `publish`. Les exécutions concurrentes
sont mises en attente, jamais interrompues pendant une publication.

Chaque exécution produit un résumé sans clé, source privée ou réponse API brute.
Il indique l’étape, l’état et le lien d’article lorsqu’une publication est vérifiée.
Les sources privées et brouillons ne sont pas téléversés en artefacts publics.
Ils disparaissent avec le runner à la fin du travail.

## Alertes

Lors d’un échec, une Issue **Bot éditorial UFC.fr : intervention nécessaire**
est créée et assignée à `mbosseu`. Si elle existe déjà, elle est mise à jour
pour éviter les doublons. Un passage de publication rétabli ferme l’alerte.
Un simple test `check` réussi ne ferme pas une erreur de publication.
Une recherche sans sujet éligible est un passage normal, sans alerte.

Les notifications sont visibles dans GitHub. La réception d’e-mails dépend
des préférences du compte : https://github.com/settings/notifications
Il est possible de suivre aussi le dépôt avec la catégorie Issues et de régler
les notifications Actions sur les échecs.

Après un push dont le déploiement n’est pas confirmé, vérifier le site et le commit
avant de relancer un mode `publish`. Les articles existants sont détectés comme
doublons, et le bot n’effectue jamais de force-push.

## Serveur dédié facultatif

Hetzner Cloud : https://www.hetzner.com/cloud/

Un VPS Ubuntu avec environ 2 vCPU et 4 Go de RAM convient à la recherche,
la génération par API et Chromium. La génération d’images est effectuée chez
OpenAI, aucun GPU local n’est requis. GitHub Actions évite pour l’instant
d’avoir à acheter et maintenir ce serveur. Les consommations API restent facturées.
