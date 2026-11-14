# Klaak — site officiel

Site du DJ Klaak (hitech, collectif Outrance, Lyon). Astro + TypeScript + Tailwind + GSAP, déployé en Worker
Cloudflare avec assets statiques.

## Développer

```bash
npm install
npm run dev        # serveur de développement Astro
npm run preview    # build + Worker en local (wrangler dev), pour tester /api/booking
```

Pour tester le formulaire en local, copier `.dev.vars.example` en `.dev.vars` et y mettre les secrets.

## Déployer (Workers Builds)

- Commande de build : `npm run build`
- Commande de déploiement : `npx wrangler deploy`
- Push sur `main` = production ; chaque branche a son URL de preview.
- Secrets du Worker (tableau de bord Cloudflare → Settings → Variables and Secrets) :
  `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`.

## Contenu

Tout le contenu est dans `src/data/`. Le guide « ajouter une date, un set ou une photo » sera complété au fil de
la construction.

## À compléter

- `src/data/site.json` : `url` (nom de domaine final), `turnstileSiteKey` (clé publique Turnstile).
- `brief/dates.md` : lieux, villes et organisateurs marqués `[À COMPLÉTER]`, titre du set Esoteros.
- URL des sets SoundCloud, crédit photo.
