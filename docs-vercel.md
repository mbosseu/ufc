# Le déploiement, et pourquoi ce `vercel.json` est écrit comme ça

Ce fichier existe parce que JSON n'accepte pas de commentaires — et parce que
**Vercel refuse tout fichier de configuration contenant une propriété qu'il ne
connaît pas.** Les explications avaient d'abord été mises dans des clés
`_note_trailingSlash` et `_note_build`, ce qui paraissait inoffensif. Ça ne
l'était pas : l'import échouait avec

```
Invalid request: should NOT have additional property `_note_trailingSlash`.
```

et plus aucun déploiement ne partait. Le site est resté seize heures sur une
version périmée sans que la cause soit visible ailleurs que dans cette
fenêtre d'import. **Rien d'autre que le schéma de Vercel ne doit entrer dans
`vercel.json`.**

## `trailingSlash: true`

Ce n'est pas un détail de confort. Toutes les URL déjà indexées par Google sur
l'ancien WordPress se terminent par une barre oblique : `/cage-fight-toulouse-club-mma/`.
Passer à `false` ferait répondre `308` à chacune d'elles — ce qui annulerait la
raison même d'avoir conservé les slugs d'origine lors de la migration.

Si un jour la production répond `308` sur une URL en `/…/`, c'est que ce
réglage a sauté ou qu'un vieux build est encore en ligne.

## Construction côté Vercel

`buildCommand` exécute `npm run build`. Le site reste statique et le build
n'utilise que Node.js, mais la production doit être régénérée depuis les
sources à chaque push. Sans cela, une correction du gabarit, du sitemap ou du
flux RSS peut être présente dans le générateur tout en restant absente des
fichiers servis en ligne.

`installCommand` reste vide volontairement : le build de production n'a
aucune dépendance externe. Les dépendances de développement servent seulement
aux captures visuelles locales.

Il reste utile de lancer `npm run build && npm run check` avant de commiter :
Vercel rejouera le même build, et le contrôle local attrapera les erreurs avant
le déploiement.

## En-têtes de cache

Les médias sont immuables (un an) parce que leur nom contient leur chemin
d'origine et ne change jamais sans que le contenu change. Le CSS et le JS sont
revalidés toutes les heures : ce sont eux qui bougent.
