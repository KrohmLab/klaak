# Klaak — site officiel

Portfolio du DJ Klaak (hitech, collectif Outrance, Lyon). Objectif : générer des demandes de booking.
Le brief complet et toutes les sources sont dans `brief/` (ne pas chercher de contenu ailleurs).

## Décisions

- **Concept « Le set »** : le scroll est la tête de lecture. Chapitres : Intro → Montée → Drop (sets) →
  Breakdown (bio FR/EN) → Montée finale (dates) → Dernier drop (booking). HUD fixe en mono (chapitre, timecode,
  forme d'onde), en bas sur mobile, qui sert de navigation.
- **Direction visuelle A « Glitch chromatique »** (validée) : le logo au pinceau percuté par le numérique.
  Fond #07060D, dédoublement cyan #19E3FF / magenta #FF2BD6, tranches vert acide #C6FF1A, orange #FF8A00 pour
  les moments chauds, photos en duotone. Typos : Unbounded (display), JetBrains Mono (accents).
- **Stack** : Astro (statique) + TypeScript + Tailwind 4 + GSAP (ScrollTrigger, SplitText).
  Écartés : React Router + Motion (hydratation inutile), Three.js (poids), Lenis (détourne le scroll).
- **Hébergement** : Worker Cloudflare, assets statiques `dist/`. Le script `worker/index.ts` ne traite que
  `/api/*` ; `/api/booking` = origine + champ piège `website` + Turnstile + Resend.
- **Dates** : toutes passées → la timeline est un historique, dernier emplacement « la vôtre ? » → booking.

## Conventions

- Tout le contenu dans `src/data/` (JSON/MD). Aucun texte de contenu en dur dans les composants.
- Jamais de faux contenu. Ce qui manque = `[À COMPLÉTER]` visible, listé dans le README.
- Ne jamais écrire ni demander la valeur d'un secret. Secrets : `.dev.vars` en local, variables du Worker en prod.
- Performance et accessibilité priment sur l'effet : `prefers-reduced-motion`, contenu lisible sans JS,
  SoundCloud chargé au clic, images AVIF/WebP.
- Travail sur branches, commits atomiques, messages en français. `main` = production.
- Commandes : `npm run dev`, `npm run build` (astro check + build), `npm run preview` (build + wrangler dev).

## Design system (étape 3)

- Tokens et classes dans `src/styles/global.css` (`@theme` Tailwind + classes `.t-*`, `.btn`, `.tag`, `.todo`,
  `.card`, `.glitch`, `.logo`, `.duo`, `.hud`, `.marquee`, `.field`). Référence vivante : `/styleguide`.
- Motion : `src/scripts/motion.ts` (patterns `klaak`, `rise`, `split`, `glitch`, attributs `data-motion` /
  `data-replay`, `--shift` piloté par la vitesse du scroll). Tout y gère `prefers-reduced-motion`.
- Données : `src/data/*.json`, lues via `src/lib/content.ts`. `null` = manquant → composant `Todo`.
- Images : sources dans `src/assets/photos|posters`, rendues avec `<Picture>` (AVIF/WebP). Logo vectorisé :
  `public/logo.svg`, utilisé en masque CSS.
- URL : production https://klaak.krohmlab.workers.dev, previews `<branche>-klaak.krohmlab.workers.dev`.
- Secrets de production : au 14/11/2026, `/api/booking` répondait encore `config` (secrets absents).

## Avancement

- [x] 1. Recherche, concept, stack (direction A validée)
- [x] 2. Initialisation (Astro, wrangler.jsonc, Worker /api/booking testé en local)
- [x] 3. Design system + page `/styleguide` (branche `design-system`, en attente de validation)
- [ ] 4. Construction chapitre par chapitre
- [ ] 5. Recette (retirer le `noindex` de `src/layouts/Base.astro`)

## En attente de Kevin

- Clé de site Turnstile, nom de domaine final (`src/data/site.json`).
- Titre du set Esoteros (`src/data/sets.json`, `title: null`).
- Champs `[À COMPLÉTER]` de `brief/dates.md` ; accord pour reprendre les infos lisibles sur les affiches.
- Écarts à trancher : « Halloween Nights » (pluriel sur les affiches), Esoteros 12-13 sept., affiche
  « Nexen Teaser Party 01/03/2025 » sans ligne dans le tableau, affiche Psychedelic Christmas manquante.
- Crédit photo (NVP), usage des photos avec pancarte « ROUX » (dont une personne reconnaissable).
- Piste de DA préférée parmi les 10 (seules 01 et 03 sont dans `brief/da/`).
