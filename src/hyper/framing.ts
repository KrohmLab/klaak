// Cadrage des photos (spec §4, prototype `frameImg()`), en fonction pure.
//
// Chaque photo a un point focal (le visage, hx/hy en fraction de l'image) et deux cadrages :
// - dans le cercle : visage et épaules, le centre du cercle (fx/fy) un peu sous le visage, zoom kp ;
// - plein écran : visage amené en (tx, ty) (fraction de l'écran), dans le tiers libre, zoom kf.
// Pendant l'ouverture, on interpole DANS L'ESPACE ÉCRAN : zoom apparent et position du visage progressent d'un
// seul mouvement, vers la position réellement atteignable sans bord visible.

export type Focal = {
  hx: number;
  hy: number;
  fx?: number;
  fy?: number;
  tx: number;
  ty: number;
  /** Zoom plein écran (défaut 1,45). */
  kf?: number;
  /** Zoom dans le cercle (défaut 1,12). */
  kp?: number;
  /** Proportions de l'image (largeur / hauteur). */
  ar: number;
  /** Centre réel du visage (contrôle uniquement : ?debug). */
  face?: [number, number];
  /** Mise en page étroite (téléphone, tablette debout) : le CENTRE DU VISAGE (`face`) est amené en (x, y),
   *  zoom k. Sans valeur : comme sur ordinateur. */
  mobile?: { x: number; y: number; k?: number };
};

import { isNarrow } from "./portal";

export type FrameContext = {
  /** Avancée de l'ouverture (0 → 1), 1 au repos. */
  pan: number;
  /** Centre du cercle et rayon, en coordonnées locales de la scène. */
  lx: number;
  ly: number;
  rl: number;
  /** Scène en train d'entrer (échelle, centre du portail, translation, échelle de départ), sinon null. */
  ent: { sc: number; g: [number, number]; tx: number; ty: number; s0: number } | null;
};

export type ImageFrame = { sx: number; sy: number; k: number; bw: number; bh: number };

/** Boîte de base de l'image : elle couvre l'écran, à ses proportions. */
export const baseBox = (ar: number, W: number, H: number) => ({ bw: Math.max(W, H * ar), bh: Math.max(H, W / ar) });

export function frameImg(P: Focal, W: number, H: number, c: FrameContext): ImageFrame {
  const { bw, bh } = baseBox(P.ar, W, H);
  const m = isNarrow(W, H) && P.mobile && P.face ? P.mobile : null;
  // Point d'ancrage plein écran : haut de la tête (valeurs du prototype) ou, sur téléphone, centre du visage.
  const hx = m ? P.face![0] : P.hx;
  const hy = m ? P.face![1] : P.hy;
  const tx = m ? m.x : P.tx;
  const ty = m ? m.y : P.ty;
  const kf = (m ? m.k : undefined) ?? P.kf ?? 1.45;
  const kp = P.kp ?? 1.12;
  const pfx = P.fx ?? P.hx;
  const pfy = P.fy ?? P.hy + 0.16;
  const fx = pfx + (hx - pfx) * c.pan;
  const fy = pfy + (hy - pfy) * c.pan;

  // Position finale réellement atteignable (cadrage plein écran sans bord visible).
  const iwF = bw * kf;
  const ihF = bh * kf;
  const sxF = Math.max(W / 2 - iwF / 2, Math.min(iwF / 2 - W / 2, tx * W - (W / 2 + (hx - 0.5) * iwF)));
  const syF = Math.max(H / 2 - ihF / 2, Math.min(ihF / 2 - H / 2, ty * H - (H / 2 + (hy - 0.5) * ihF)));
  const TX = W / 2 + sxF + (hx - 0.5) * iwF;
  const TY = H / 2 + syF + (hy - 0.5) * ihF;

  let k: number;
  let ltx: number;
  let lty: number;
  if (c.ent) {
    const e = c.ent;
    const zs = e.s0 * kp;
    const zeff = zs + (kf - zs) * c.pan;
    k = zeff / e.sc;
    const Sx = e.g[0] + (TX - e.g[0]) * c.pan;
    const Sy = e.g[1] + (TY - e.g[1]) * c.pan;
    ltx = e.g[0] + (Sx - e.tx - e.g[0]) / e.sc;
    lty = e.g[1] + (Sy - e.ty - e.g[1]) / e.sc;
  } else {
    k = kf;
    ltx = TX;
    lty = TY;
  }
  const iw = bw * k;
  const ih = bh * k;
  let sx = ltx - (W / 2 + (fx - 0.5) * iw);
  let sy = lty - (H / 2 + (fy - 0.5) * ih);
  // L'image doit couvrir la zone révélée (cercle ∩ scène) : on borne la translation.
  const bx0 = Math.max(0, c.lx - c.rl);
  const bx1 = Math.min(W, c.lx + c.rl);
  const by0 = Math.max(0, c.ly - c.rl);
  const by1 = Math.min(H, c.ly + c.rl);
  const minX = bx1 - iw / 2 - W / 2;
  const maxX = bx0 + iw / 2 - W / 2;
  const minY = by1 - ih / 2 - H / 2;
  const maxY = by0 + ih / 2 - H / 2;
  sx = minX > maxX ? (minX + maxX) / 2 : Math.max(minX, Math.min(maxX, sx));
  sy = minY > maxY ? (minY + maxY) / 2 : Math.max(minY, Math.min(maxY, sy));
  return { sx, sy, k, bw, bh };
}

/**
 * Position (coordonnées locales de la scène) du visage pour un cadrage donné. Dans les valeurs du prototype,
 * (hx, hy) vise souvent le haut de la tête : on contrôle le centre réel du visage (`face`, relevé sur chaque
 * photo), à défaut (fx, fy).
 */
export function facePoint(P: Focal, f: ImageFrame, W: number, H: number): [number, number] {
  const x = P.face?.[0] ?? P.fx ?? P.hx;
  const y = P.face?.[1] ?? P.fy ?? P.hy + 0.16;
  return [W / 2 + f.sx + (x - 0.5) * f.bw * f.k, H / 2 + f.sy + (y - 0.5) * f.bh * f.k];
}
