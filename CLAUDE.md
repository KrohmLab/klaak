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

## Avancement

- [x] 1. Recherche, concept, stack (direction A validée)
- [x] 2. Initialisation (Astro, wrangler.jsonc, Worker /api/booking testé en local)
- [ ] 3. Design system + page `/styleguide`
- [ ] 4. Construction chapitre par chapitre
- [ ] 5. Recette (retirer le `noindex` de `src/layouts/Base.astro`)

## En attente de Kevin

- Clé de site Turnstile, nom de domaine final (`src/data/site.json`).
- URL exactes des sets SoundCloud (Nexen 2025, Psychedelic Christmas, Esoteros).
- Champs `[À COMPLÉTER]` de `brief/dates.md` ; accord pour reprendre les infos lisibles sur les affiches.
- Écarts à trancher : « Halloween Nights » (pluriel sur les affiches), Esoteros 12-13 sept., affiche
  « Nexen Teaser Party 01/03/2025 » sans ligne dans le tableau, affiche Psychedelic Christmas manquante.
- Crédit photo (NVP), usage des photos avec pancarte « ROUX » (dont une personne reconnaissable).
- Piste de DA préférée parmi les 10 (seules 01 et 03 sont dans `brief/da/`).
