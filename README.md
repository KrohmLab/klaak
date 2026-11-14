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

- Page d'accueil : `/`
- Design system vivant : `/styleguide` (non indexé)

## Déployer (Workers Builds)

- Commande de build : `npm run build`
- Commande de déploiement : `npx wrangler deploy`
- Push sur `main` = production (https://klaak.krohmlab.workers.dev) ; chaque branche a son URL de preview
  (`<branche>-klaak.krohmlab.workers.dev`).
- Secrets du Worker (tableau de bord Cloudflare → Settings → Variables and Secrets) :
  `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`.

## Modifier le contenu

Tout le contenu est dans `src/data/`. Aucun texte n'est à chercher dans le code.

| Fichier | Contenu |
|---|---|
| `site.json` | Nom, liens, e-mail de booking, URL du site, clé Turnstile, crédit photo, indexation |
| `dates.json` | Historique des dates |
| `sets.json` | Sets SoundCloud |
| `bio.fr.md`, `bio.en.md` | Bio en français et en anglais |
| `copy.json` | Titres, accroches, libellés du formulaire, textes alternatifs des photos |

Règle : une information inconnue se note `null`. Elle s'affiche alors comme un placeholder orange
`[À COMPLÉTER]` sur le site, jamais comme une valeur devinée.

### Ajouter une date

1. Déposer l'affiche dans `src/assets/posters/` (JPEG de préférence, format bannière ~1200 × 630).
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
- `poster` : nom du fichier dans `src/assets/posters/`, ou `null` s'il n'y a pas encore d'affiche.
- `set` : l'`id` d'un set de `sets.json`, pour afficher « Écouter le set ».
- `badges` : par exemple `["sold out"]` ou `["closing"]`.
- `link` : page de l'événement (Facebook, Shotgun…).

### Ajouter un set

Ajouter un bloc dans `src/data/sets.json` (le premier de la liste s'affiche en premier) :

```json
{ "id": "nom-court", "title": "Klaak @ Nom de l'événement", "url": "https://soundcloud.com/klaak/..." }
```

Le lecteur SoundCloud n'est chargé que lorsque le visiteur clique sur lecture.

### Ajouter ou changer une photo

1. Déposer la photo dans `src/assets/photos/` (JPEG, 2000 px de large suffisent). Les versions AVIF/WebP et les
   tailles responsives sont générées au build.
2. Les photos sont appelées par leur nom de fichier sans extension, avec `photo("nom")` :
   - fond de la Montée : `src/components/chapters/Montee.astro` (`montee-casque`)
   - photo de scène du Drop : `src/components/chapters/Drop.astro` (`drop-scene`)
   - portrait du Breakdown : `src/components/chapters/Breakdown.astro` (`breakdown-portrait`)

   Pour remplacer une photo sans toucher au code, garder le même nom de fichier.
3. Mettre à jour son texte alternatif dans `src/data/copy.json` (`photoAlt`, `portraitAlt`).

Traitements disponibles (voir `/styleguide`) : `duo` (duotone acide, magenta, cyan, orange) et `shot` (pleine
couleur, cadre dédoublé).

### Changer le logo

Remplacer `public/logo.svg` (tracé unique, même proportions), puis lancer `npm run brand` pour régénérer
l'image Open Graph, le favicon et l'icône iOS.

## Mise en ligne : ce qu'il reste à compléter

- [ ] `src/data/site.json` → `turnstileSiteKey` : clé de site Turnstile. Tant qu'elle est vide, le formulaire
      affiche « Formulaire inactif » et l'envoi est désactivé (le lien e-mail reste disponible).
- [ ] Secrets `TURNSTILE_SECRET_KEY` et `RESEND_API_KEY` sur le Worker.
- [ ] `src/data/site.json` → `url` : nom de domaine final (sert aux URL canoniques, à l'Open Graph, au sitemap).
- [ ] `src/data/site.json` → `indexable` : passer à `true` pour ouvrir le site aux moteurs de recherche.
- [ ] `src/data/site.json` → `photoCredit` : crédit du ou des photographes.
- [ ] `src/data/dates.json` → lieux, villes et organisateurs à `null` (Nexen 2025 et 2026, Halloween Night 2025
      et 2026, Esoteros 2026) ; affiche de Psychedelic Christmas.

## Accessibilité et performance

- Mode calme : activé automatiquement si le système demande de réduire les animations, ou à la main depuis le
  pied de page. Aucune scène n'est alors épinglée ni animée ; tout le contenu reste affiché.
- Sans JavaScript, la page est une suite de sections lisibles.
- Les scènes au scroll sont dans `src/scripts/scenes/`, les patterns réutilisables dans `src/scripts/motion.ts`.
