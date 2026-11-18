# Klaak — site officiel

Site du DJ Klaak (hitech, collectif Outrance, Lyon). Une page racontée au scroll comme un set :
Intro → Montée → Drop (sets) → Breakdown (bio) → Montée finale (dates) → Dernier drop (booking).

Astro + TypeScript + Tailwind 4 + GSAP, déployé en Worker Cloudflare avec assets statiques.

## Développer

```bash
npm install
npm run dev        # serveur de développement Astro (http://localhost:4321)
npm run preview    # build + Worker en local (wrangler dev), pour tester /api/booking
```

Pour tester le formulaire en local, copier `.dev.vars.example` en `.dev.vars` et y mettre les secrets.

- Page d'accueil : `/` (outils : `?u=2.5` fige le voyage à une position, `?debug` expose `window.__hx.inspect()`)
- Banc d'essai du moteur : `/moteur` ; design system : `/styleguide` (non indexés)
- Tests : `npm test` (couverture des images, aimantation, cadrage, classes CSS)

## Déployer (Workers Builds)

- Commande de build : `npm run build`
- Commande de déploiement : `npx wrangler deploy`
- Push sur `main` = production (https://klaak.krohmlab.workers.dev) ; chaque branche a son URL de preview
  (`<branche>-klaak.krohmlab.workers.dev`).
- Secrets du Worker (tableau de bord Cloudflare → Settings → Variables and Secrets) :
  `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`.

## Modifier le contenu

La page d'accueil est un voyage en zoom infini (« Hyperespace ») : chaque scène plonge dans la suivante par un
portail circulaire. Tout le contenu est dans `src/data/`, aucun texte n'est à chercher dans le code.

| Fichier | Contenu |
|---|---|
| `hyper.json` | Textes de chaque scène, noms des chapitres, photos et leur cadrage |
| `dates.json` | Historique des dates (scène « Les dates ») |
| `sets.json` | Sets SoundCloud (scène « Les sets ») : titre, sous-titre, couleur, pochette |
| `site.json` | Liens, e-mail de booking, URL du site, clé Turnstile, crédit photo, indexation |
| `copy.json` | Libellés et messages du formulaire de booking |
| `bio.fr.md`, `bio.en.md` | Bio officielle (description du site et données structurées) |

Règle : une information inconnue se note `null`. Elle s'affiche alors comme un placeholder orange
`[À COMPLÉTER]` sur le site, jamais comme une valeur devinée.

### Ajouter une date

1. Déposer l'affiche dans `src/assets/posters/` (JPEG, format bannière ~1200 × 630).
2. Ajouter un bloc dans `src/data/dates.json`, à sa place dans l'ordre chronologique :

```json
{
  "id": "2027-03-12-nom-de-la-soiree",
  "when": "12 mars 2027",
  "start": "2027-03-12",
  "end": "2027-03-12",
  "event": "Nom de la soirée",
  "organizer": "Organisateur",
  "venue": "Lieu",
  "city": "Ville",
  "poster": "2027-03-12-nom-de-la-soiree.jpg",
  "set": null,
  "badges": [],
  "link": null
}
```

- `when` est le texte affiché ; `start` et `end` sont les dates au format `AAAA-MM-JJ`.
- `poster` : nom du fichier dans `src/assets/posters/`, ou `null` (une tuile au nom de l'événement s'affiche).
- `badges` : par exemple `["sold out"]` ou `["closing"]`. `link` : page de l'événement.

La scène s'allonge toute seule : un cran de molette par date, l'orbite n'affiche que les plus proches.

### Ajouter un set

Ajouter un bloc dans `src/data/sets.json` (l'ordre du fichier est l'ordre de la tracklist) :

```json
{
  "id": "nom-court",
  "title": "Klaak @ Nom de l'événement",
  "sub": "Événement · mois année",
  "url": "https://soundcloud.com/klaak/...",
  "color": "#c6ff1a",
  "art": { "poster": "fichier-de-src-assets-posters.jpg" }
}
```

- `color` recolore tout le site quand le set est choisi (vert acide `#c6ff1a`, magenta `#ff2bd6`, orange `#ff8a00`,
  cyan `#19e3ff`).
- `art` : une affiche, ou une photo cadrée sur un point : `{ "photo": "montee-casque", "fx": 0.47, "fy": 0.23 }`.

### Changer une photo de scène

Les photos sont dans `src/assets/photos/` (JPEG ; les versions AVIF/WebP sont générées au build). Chaque scène
désigne la sienne dans `src/data/hyper.json` → `photos` :

```json
"collectif": {
  "photo": "montee-sourire",
  "face": [0.54, 0.25],
  "mobile": { "x": 0.6, "y": 0.15, "k": 1.3 },
  "alt": "…",
  "tint": "#ff2bd6",
  "credit": "NVP Photographie",
  "hx": 0.53, "hy": 0.14, "tx": 0.79, "ty": 0.32
}
```

- Toutes les positions sont en fraction (0 = gauche / haut, 1 = droite / bas).
- `face` : centre du visage sur la photo.
- `hx`, `hy` : point d'ancrage (le haut de la tête) ; `tx`, `ty` : où l'amener à l'écran, en plein écran sur
  ordinateur ; `kf` : zoom plein écran (défaut 1,45) ; `kp` : zoom dans le cercle (défaut 1,12) ; `fx`, `fy` :
  centre du cercle sur la photo (défaut : un peu sous `hx`, `hy`).
- `mobile` : sur téléphone, le visage est amené en (`x`, `y`) avec le zoom `k`.
- Pour vérifier un cadrage : ouvrir `/?u=2` (le voyage est figé sur la scène 2 ; `?u=1` montre la scène 2 dans le
  cercle). La règle : le visage n'est jamais sous un texte ni derrière le portail.

### Changer le logo

Remplacer `public/logo.svg` (tracé unique, mêmes proportions), puis lancer `npm run brand` pour régénérer
l'image Open Graph, le favicon et l'icône iOS.

## Mise en ligne : ce qu'il reste à compléter

- [ ] `src/data/site.json` → `turnstileSiteKey` : clé de site Turnstile. Tant qu'elle est vide, le formulaire
      affiche « Formulaire inactif » et l'envoi est désactivé (le lien e-mail reste disponible).
- [ ] Secrets `TURNSTILE_SECRET_KEY` et `RESEND_API_KEY` sur le Worker.
- [ ] `src/data/site.json` → `url` : nom de domaine final (sert aux URL canoniques, à l'Open Graph, au sitemap).
- [ ] `src/data/site.json` → `indexable` : passer à `true` pour ouvrir le site aux moteurs de recherche.
- [ ] `src/data/hyper.json` → `photos.revelation.credit` : crédit de la photo d'Esoteros 2026.
- [ ] `src/data/dates.json` → lieux, villes et organisateurs à `null` (Nexen 2025 et 2026, Halloween Night 2025
      et 2026, Esoteros 2026) ; affiche de Psychedelic Christmas.

## Accessibilité et performance

- Mode calme : activé automatiquement si le système demande de réduire les animations, ou à la main depuis le
  pied de page. Aucune scène n'est alors épinglée ni animée ; tout le contenu reste affiché.
- Sans JavaScript, la page est une suite de sections lisibles.
- Les scènes au scroll sont dans `src/scripts/scenes/`, les patterns réutilisables dans `src/scripts/motion.ts`.
