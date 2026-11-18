// La transition portail (spec §3), en fonction PURE de `u` et de la taille de l'écran : revenir en arrière
// rejoue exactement la même image. Reproduit les courbes et valeurs du prototype (`frame()`).
//
// Repères : chaque scène est un calque plein écran. Un point local p s'affiche en
//   écran = origine + échelle · (p − origine) + (tx, ty)
// L'origine est le centre du portail concerné (portail suivant pour une scène qui sort, son propre portail pour
// une scène qui entre). Le clip-path est exprimé en coordonnées locales.

import type { Timeline } from "./timeline";

export type Vec = [number, number];

export type SceneState = {
  /** La scène doit être peinte. */
  visible: boolean;
  opacity: number;
  scale: number;
  origin: Vec;
  tx: number;
  ty: number;
  /** Cercle de révélation en coordonnées locales, ou null (pas de clip). */
  clip: { r: number; x: number; y: number } | null;
  /** Opacité des textes de la scène. */
  text: number;
  /** Pour une scène qui entre : progression de l'ouverture (0 → 1), sinon null. */
  enter: number | null;
  /** Pour une scène qui entre : données utiles au cadrage photo (framing.ts). */
  entering: { pan: number; center: Vec; lens: Vec; rLocal: number; sc: number; tx: number; ty: number; s0: number } | null;
};

export type RingState = {
  /** Anneau « onde de choc » sur l'iris en cours d'ouverture. */
  shock: { on: boolean; r: number; center: Vec; opacity: number; energy: number };
  /** Anneau du portail au repos (avant ouverture, pendant l'éclosion). */
  rest: { on: boolean; r: number; center: Vec; opacity: number };
};

export type Frame = {
  scenes: SceneState[];
  rings: RingState;
  /** Chapitre courant (scène dominante à l'écran). */
  chapter: number;
  /** Rayon du portail au repos (19 vh). */
  hole: number;
};

export type Viewport = { w: number; h: number };

/**
 * Mise en page « étroite » (téléphone, tablette debout) : largeur ≤ 760 px OU écran en portrait.
 * Même condition que le CSS : @media (max-width: 760px), (max-aspect-ratio: 9/10).
 */
export const NARROW_MAX = 760;
export const isNarrow = (w: number, h: number) => w <= NARROW_MAX || w / Math.max(h, 1) <= 0.9;

export const PORTAL = {
  /** Profondeur de plongée de la scène qui sort (réglable, 2,5 à 7 dans le prototype). */
  zoom: 4,
  /** Rayon du portail au repos, en fraction de la hauteur : 19 vh ; 9 vh en mise en page étroite (sinon il
   *  occupe 80 % de la largeur d'un téléphone et ne laisse de place ni au visage ni au texte). */
  hole: 0.19,
  holeNarrow: 0.09,
  /** Hauteur du centre des portails en mise en page étroite : logo puis visage au-dessus, texte en dessous. */
  centerYNarrow: 0.46,
  /** Durée (en unités) de l'éclosion du portail suivant à l'arrivée sur une scène. */
  bloom: 0.45,
  /** Marge au-delà du coin le plus éloigné pour le rayon final. */
  margin: 24,
  /** Sur-couverture de sécurité (évite un liseré d'un pixel). */
  cover: 1.004,
} as const;

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smoothstep = (x: number) => x * x * (3 - 2 * x);

/** Rayon du portail au repos. */
export const holeRadius = (vp: Viewport) => vp.h * (isNarrow(vp.w, vp.h) ? PORTAL.holeNarrow : PORTAL.hole);

/** Centre du portail qui révèle la scène i. */
export function portalCenter(tl: Timeline, i: number, vp: Viewport): Vec {
  const spec = tl.scenes[i];
  if (spec?.portal) return spec.portal(vp.w, vp.h);
  return [vp.w / 2, vp.h * (isNarrow(vp.w, vp.h) ? PORTAL.centerYNarrow : 0.5)];
}

/** Rayon nécessaire pour qu'un cercle centré en c couvre tout l'écran. */
export const rmaxAt = (c: Vec, vp: Viewport) => Math.hypot(Math.max(c[0], vp.w - c[0]), Math.max(c[1], vp.h - c[1])) + PORTAL.margin;

/** Éclosion du portail (easeOutBack du prototype) pour une avancée ba ∈ [0, 1]. */
export function bloomAt(ba: number): number {
  if (ba <= 0) return 0;
  const x = ba - 1;
  return 1 + 2.4 * x * x * x + 1.4 * x * x;
}

/**
 * État de toutes les scènes pour la position `u`.
 * `reduced` : mode calme. Pas de zoom ni de cercle : la scène qui entre apparaît en fondu par-dessus.
 */
export function layout(tl: Timeline, u: number, vp: Viewport, opts: { zoom?: number; reduced?: boolean } = {}): Frame {
  const Z = opts.zoom ?? PORTAL.zoom;
  const reduced = !!opts.reduced;
  const { w: W, h: H } = vp;
  const hole = holeRadius(vp);
  const last = tl.scenes.length - 1;
  const scenes: SceneState[] = [];
  const rings: RingState = {
    shock: { on: false, r: 0, center: [W / 2, H / 2], opacity: 0, energy: 0 },
    rest: { on: false, r: 0, center: [W / 2, H / 2], opacity: 0 },
  };
  let chapter = 0;
  let best = -1;

  for (let i = 0; i <= last; i++) {
    const s = tl.start[i] ?? 0;
    const holdEnd = s + (tl.len[i] ?? 1) - 1;
    const d0 = u < s ? u - s : u > holdEnd ? u - holdEnd : 0;
    // Tolérance : à 6 millièmes près de l'arrivée, la scène est considérée posée.
    const d = d0 < 0 && d0 > -0.006 ? 0 : d0;
    const st: SceneState = {
      visible: false,
      opacity: 0,
      scale: 1,
      origin: portalCenter(tl, i + 1, vp),
      tx: 0,
      ty: 0,
      clip: null,
      text: 0,
      enter: null,
      entering: null,
    };
    const prevStart = tl.start[i - 1];

    if (d >= 0) {
      // Scène posée ou qui sort : elle plonge vers le portail suivant.
      st.visible = d < 1.02 || i === last;
      st.scale = i === last || reduced ? 1 : 1 + (Z - 1) * Math.pow(Math.min(d, 1), 1.7);
      st.opacity = i === last ? 1 : 1 - clamp01((d - 0.82) / 0.18);
      st.text = Math.max(0, 1 - d / 0.28);
    } else if (i > 0 && prevStart !== undefined && u >= prevStart - PORTAL.bloom) {
      // Scène qui entre : empilée au-dessus, révélée par un cercle.
      const c = portalCenter(tl, i, vp);
      st.origin = c;
      const e = d < -1 ? 0 : d + 1;
      st.enter = e;
      const ba = clamp01((u - prevStart + PORTAL.bloom) / PORTAL.bloom);
      const bloom = bloomAt(ba);
      const spec = tl.scenes[i];

      if (reduced) {
        st.opacity = smoothstep(e);
        st.visible = st.opacity > 0.001;
        st.text = clamp01((e - 0.74) / 0.26);
      } else {
        const Rmax = rmaxAt(c, vp);
        const r0 = spec?.preview ? hole * bloom : 0;
        const R = r0 + (Rmax - r0) * Math.pow(e, 2.1);
        st.visible = R > 0.5;
        const ox = W / 2 - c[0];
        const oy = H / 2 - c[1];
        const pe = smoothstep(e);
        // Contrainte de couverture, analytique : l'image doit couvrir la zone révélée (cercle ∩ écran).
        const bx0 = Math.max(0, c[0] - R);
        const bx1 = Math.min(W, c[0] + R);
        const by0 = Math.max(0, c[1] - R);
        const by1 = Math.min(H, c[1] + R);
        const s0 = spec?.s0 ?? 0.52;
        let sc = s0 + (1 - s0) * Math.pow(e, 1.25);
        sc =
          Math.max(sc, (c[0] - bx0) / (W / 2 - ox * pe), (bx1 - c[0]) / (W / 2 + ox * pe), (c[1] - by0) / (H / 2 - oy * pe), (by1 - c[1]) / (H / 2 + oy * pe)) *
          PORTAL.cover;
        st.scale = sc;
        // Portail décalé (intro) : l'image glisse de « point focal au centre du cercle » à « plein écran ».
        st.tx = -sc * ox * (1 - pe);
        st.ty = -sc * oy * (1 - pe);
        st.opacity = 1;
        const lx = c[0] + ox * (1 - pe);
        const ly = c[1] + oy * (1 - pe);
        st.clip = { r: R / sc, x: lx, y: ly };
        st.entering = { pan: pe, center: c, lens: [lx, ly], rLocal: R / Math.max(sc, 0.01), sc, tx: st.tx, ty: st.ty, s0 };
        st.text = clamp01((e - 0.74) / 0.26);

        if (st.visible && e > 0.0005 && !rings.shock.on) {
          rings.shock = { on: true, r: R, center: c, opacity: clamp01((Rmax * 0.97 - R) / (Rmax * 0.25)), energy: Math.sin(Math.PI * e) };
        } else if (st.visible && e <= 0.0005 && !rings.rest.on) {
          rings.rest = { on: true, r: R, center: c, opacity: Math.min(1, bloom) };
        }
      }
    }

    // Chapitre courant : la scène posée (ou à moins d'une demi-unité de sa sortie) l'emporte.
    const weight = d >= 0 ? (d < 0.5 ? 2 - d : st.opacity) : 0;
    if (weight > best) {
      best = weight;
      chapter = i;
    }
    scenes.push(st);
  }
  return { scenes, rings, chapter, hole };
}
