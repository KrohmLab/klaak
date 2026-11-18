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

## Construction (étape 4)

- Page : `src/pages/index.astro` assemble `src/components/chapters/*` (Intro, Montee, Drop, Breakdown, Dates,
  Booking), `Footer` et le `Hud` vivant.
- Scènes au scroll : `src/scripts/scenes/*.ts`, lancées dans l'ordre par `src/scripts/story.ts`. Sans JS ou en
  mode calme (`html[data-calm]`, posé dans `<head>`), aucune scène : sections empilées, tout le contenu visible.
- Mode « scène » : classes `is-story` (Montée épinglée) et `is-pinned-dates` (frise horizontale, ≥ 1024 px).
  Sous 1024 px, les dates sont un carrousel natif à cran.
- HUD (`src/scripts/hud.ts`) : indépendant de GSAP. Mobile : bouton « chapitre suivant » + Booking ; les
  segments cliquables de l'onde n'existent qu'à partir de 768 px (cibles tactiles trop petites sinon).
- Booking : `src/scripts/booking.ts`. Sans `turnstileSiteKey`, formulaire désactivé avec placeholder visible.
  Test local sans secret réel : clés de test publiques Turnstile (`1x00000000000000000000AA` côté site,
  `wrangler dev --var TURNSTILE_SECRET_KEY:1x0000000000000000000000000000000AA`).
- SEO : `src/lib/seo.ts` (MusicGroup + MusicEvent pour les dates complètes), `robots.txt` et `sitemap.xml`
  générés, `site.indexable` pilote le `noindex`. Visuels de marque : `npm run brand`.
- Photo de scène (forêt, arche, extraterrestres) fournie le 14/11/2026 : seule image en pleine couleur
  (`.shot`), au cœur du Drop.
- Lighthouse mobile sur la preview (14/11/2026) : performance 100, LCP 1,5–1,8 s. Une première mesure à 69
  était un aléa de démarrage du navigateur (non reproduit sur 3 passes ni en local).

## v2 « Hyperespace » (en cours)

- Remplace toute la page d'accueil. Sources : `brief/v2/SPEC.md` et `brief/v2/prototype-hyperespace.dc.html`
  (le prototype fait foi en cas de divergence). Le design system v1 reste valide ; la mise en scène v1
  (chapitres GSAP de la branche `construction`) n'est pas reprise.
- Planche photo du prototype (`pq0`…`pq8`) : 0 fond-ecran-rond, 1 breakdown-portrait, 2 montee-sourire,
  3 drop-bras, 4 breakdown-profil-bleu, 5 fond-foret, 6 montee-casque, 7 fond-profil-festival, 8 drop-poing.
  Affiches `po0`…`po7` = les 8 affiches de `src/assets/posters/` dans l'ordre chronologique.
- `brief/photos/esoteros-2026-scene.jpg` est le même fichier que `src/assets/photos/drop-scene.jpg`.
- Bug du prototype à ne pas reproduire : le fond photo de la scène 06 est hors de sa `<section>`.
- Décisions validées (18/11/2026) : booking = formulaire v1 dans une fenêtre par-dessus la scène 07 (lien
  e-mail en secours, « Proposer une date » idem) ; mode calme = fondu (ni zoom ni cercle) ; GSAP retiré de la
  page v2 (reste chargé à la demande pour `/styleguide` et la v1) ; textes « plus de 10 ans » (spec) ; titre
  « Klaak @ Esoteros 2026 » (confirmé par SoundCloud). Photos HD demandées à Kevin (1 920 px et moins).
- Le projet est dans Documents, synchronisé par iCloud : iCloud crée des copies « … 2 » (26 supprimées le
  18/11/2026). Si elles reviennent, les supprimer et ne jamais les committer.
- Architecture (`src/hyper/`) : `timeline.ts` (scènes, arrêts), `snap.ts` (aimantation), `portal.ts` (layout
  PUR de `u` : échelles, clips, anneaux), `engine.ts` (entrées, lissage, boucle, rendu DOM), `stars.ts`.
  Démarrage : `src/scripts/hyper.ts` lit les scènes `[data-hx-scene]` (attributs `data-hx-len`, `-stops`,
  `-preview`, `-s0`, `-portal`). Gabarit : `src/components/hyper/HyperStage.astro` (sans JS : sections
  empilées ; avec JS : `html.hx-on`, scène fixe). Constantes du prototype rendues indépendantes de la
  fréquence d'affichage (« par image à 60 i/s »).
- Tests : `npm test` (Vitest) vérifie la couverture (jamais de bord d'image visible) sur 6 tailles d'écran,
  la continuité, l'aimantation, le mode calme.
- Banc d'essai : `/moteur` (non indexé). `?u=1.4` fige une position, `?calme` force le mode calme,
  `?zoom=5` change la profondeur. Mire : cadre magenta à l'extérieur des scènes = bord d'image visible.
- Étape 2 (moteur seul) : livrée sur la branche `v2`, en attente de validation de la fluidité.

## Avancement

- [x] 1. Recherche, concept, stack (direction A validée)
- [x] 2. Initialisation (Astro, wrangler.jsonc, Worker /api/booking testé en local)
- [x] 3. Design system + page `/styleguide` (branche `design-system`, en attente de validation)
- [x] 4. Construction chapitre par chapitre (branche `construction`, à fusionner dans `main` après validation)
- [ ] 5. Recette : faite sauf envoi réel d'une demande de booking (attend clé Turnstile + secrets) et passage
      de `site.indexable` à `true`

## En attente de Kevin

- Clé de site Turnstile, nom de domaine final (`src/data/site.json`).
- Champs `[À COMPLÉTER]` de `brief/dates.md` ; accord pour reprendre les infos lisibles sur les affiches.
- Écarts à trancher : « Halloween Nights » (pluriel sur les affiches), Esoteros 12-13 sept., affiche
  « Nexen Teaser Party 01/03/2025 » sans ligne dans le tableau, affiche Psychedelic Christmas manquante.
- Crédit photo (NVP), usage des photos avec pancarte « ROUX » (dont une personne reconnaissable).
- Piste de DA préférée parmi les 10 (seules 01 et 03 sont dans `brief/da/`).
