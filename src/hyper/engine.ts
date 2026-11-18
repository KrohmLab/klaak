// Moteur du voyage « Hyperespace » : scroll virtuel, aimantation, lissage, puis rendu de la transition portail.
//
// Principe (spec §1) : la molette, le trackpad, le tactile et le clavier déplacent une cible `T`. La position
// affichée `u` suit `T` avec un lissage, et TOUT l'affichage est une fonction de `u` (portal.ts). Seuls la
// rotation décorative et les étoiles accumulent un état.
//
// Les constantes reprennent celles du prototype, exprimées « par image à 60 i/s » puis rendues indépendantes de
// la fréquence d'affichage (écrans 120 Hz).

import { baseBox, facePoint, frameImg, type Focal } from "./framing";
import { holeRadius, isNarrow, layout, PORTAL, type Frame } from "./portal";
import { nextStop, prevStop, snapStep, SNAP } from "./snap";
import { Stars } from "./stars";
import { sceneAt, type Timeline } from "./timeline";

export const INPUT = {
  /** Molette : unités par pixel de delta (delta borné à ±120 par évènement). */
  wheel: 0.0016,
  wheelMax: 120,
  /** Glisser tactile : unités par pixel. */
  touch: 0.0065,
  /** Lissage de la caméra : part de l'écart rattrapée par image à 60 i/s. */
  ease: 0.08,
  /** Lissage de la mesure de vitesse, par image à 60 i/s. */
  velEase: 0.14,
} as const;

/** Convertit un coefficient « par image à 60 i/s » pour un pas de temps quelconque. */
const perFrame = (k: number, dt: number) => 1 - Math.pow(1 - k, dt * 60);

export type EngineState = {
  /** Cible pilotée par l'utilisateur. */
  target: number;
  /** Position affichée. */
  u: number;
  /** Vitesse lissée, 0 → 1, et signée, −1 → 1. */
  vel: number;
  vs: number;
  /** Rotation décorative, en degrés. */
  spin: number;
  chapter: number;
  reduced: boolean;
  /** Durée de la dernière image (ms). */
  frameMs: number;
  w: number;
  h: number;
  /** Horodatage de l'image (performance.now). */
  now: number;
};

export type PhotoBinding = { el: HTMLElement; focal: Focal };

export type EngineOptions = {
  root: HTMLElement;
  timeline: Timeline;
  /** Calques des scènes, dans l'ordre de la timeline. */
  scenes: HTMLElement[];
  /** Conteneur des effets (anneaux, rayons) : reçoit les variables globales --vel, --spin, --wc. */
  fx: HTMLElement;
  shockRing: HTMLElement;
  restRing: HTMLElement;
  rays: HTMLElement;
  canvas: HTMLCanvasElement;
  zoom?: number;
  reduced: boolean;
  /** Photo de chaque scène (même ordre que `scenes`), cadrée par framing.ts. */
  photos?: (PhotoBinding | null)[];
  /** Fige la position (outil de mise au point : `?u=1.4`). Les entrées sont alors ignorées. */
  pin?: number;
  onFrame?: (frame: Frame, state: EngineState) => void;
  onChapter?: (chapter: number, previous: number) => void;
};

// Éléments qui gardent leur propre défilement ou leurs propres touches (menus, formulaires, sliders…).
const OWN_INPUT = "input, textarea, select, dialog, [contenteditable], [role=slider], [role=dialog], [data-hx-own-input]";
const dialogOpen = () => !!document.querySelector("dialog[open]");

export class Engine {
  private o: EngineOptions;
  private T = 0;
  private C = 0;
  private prevC = 0;
  private vel = 0;
  private vs = 0;
  private spin = 0;
  private dir = 1;
  private lastInput = -1e9;
  private touchY: number | null = null;
  private last = 0;
  private raf = 0;
  private chapter = -1;
  private stars = new Stars();
  private cache = new WeakMap<HTMLElement, Record<string, string>>();
  private w = 0;
  private h = 0;
  private frameMs = 0;
  private ro: ResizeObserver;

  constructor(o: EngineOptions) {
    this.o = o;
    this.ro = new ResizeObserver(() => this.measure());
    this.ro.observe(o.root);
    this.measure();
    if (o.pin !== undefined) this.T = this.C = this.prevC = Math.max(0, Math.min(o.timeline.umax, o.pin));
    window.addEventListener("wheel", this.onWheel, { passive: false });
    o.root.addEventListener("touchstart", this.onTouchStart, { passive: true });
    o.root.addEventListener("touchmove", this.onTouchMove, { passive: false });
    o.root.addEventListener("touchend", this.onTouchEnd, { passive: true });
    document.addEventListener("keydown", this.onKey);
    o.root.addEventListener("focusin", this.onFocus);
    this.raf = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    window.removeEventListener("wheel", this.onWheel);
    this.o.root.removeEventListener("touchstart", this.onTouchStart);
    this.o.root.removeEventListener("touchmove", this.onTouchMove);
    this.o.root.removeEventListener("touchend", this.onTouchEnd);
    document.removeEventListener("keydown", this.onKey);
    this.o.root.removeEventListener("focusin", this.onFocus);
  }

  /** Va à une position (arrêt) : utilisé par le clavier, les liens internes et le focus. */
  goTo(t: number) {
    if (this.o.pin !== undefined) return;
    this.dir = t >= this.T ? 1 : -1;
    this.T = Math.max(0, Math.min(this.o.timeline.umax, t));
    this.lastInput = performance.now() - 1000; // aimantation immédiate
  }
  /** Couleur du set en cours (étoiles). */
  setColor(rgb: [number, number, number]) {
    this.color = rgb;
  }
  get timeline() {
    return this.o.timeline;
  }
  get currentChapter() {
    return this.chapter;
  }
  goToScene(i: number) {
    const s = this.o.timeline.start[i];
    if (s !== undefined) this.goTo(s);
  }

  private measure() {
    this.w = this.o.root.clientWidth;
    this.h = this.o.root.clientHeight;
    const cv = this.o.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(this.w * dpr);
    cv.height = Math.round(this.h * dpr);
    this.o.root.style.setProperty("--hole", `${holeRadius({ w: this.w, h: this.h }).toFixed(1)}px`);
    this.o.root.style.setProperty("--pcy", isNarrow(this.w, this.h) ? `${PORTAL.centerYNarrow * 100}%` : "50%");
    this.o.photos?.forEach((p) => {
      if (!p) return;
      const { bw, bh } = baseBox(p.focal.ar, this.w, this.h);
      p.el.style.width = `${bw.toFixed(1)}px`;
      p.el.style.height = `${bh.toFixed(1)}px`;
    });
  }

  private nudge(delta: number) {
    if (!delta || this.o.pin !== undefined || dialogOpen()) return;
    this.dir = Math.sign(delta);
    this.lastInput = performance.now();
    this.T = Math.max(0, Math.min(this.o.timeline.umax, this.T + delta));
  }

  private onWheel = (e: WheelEvent) => {
    if ((e.target as Element | null)?.closest?.(OWN_INPUT) || dialogOpen()) return;
    e.preventDefault();
    let d = e.deltaY;
    if (e.deltaMode === 1) d *= 32;
    else if (e.deltaMode === 2) d *= 800;
    d = Math.max(-INPUT.wheelMax, Math.min(INPUT.wheelMax, d));
    this.nudge(d * INPUT.wheel);
  };

  private onTouchStart = (e: TouchEvent) => {
    if ((e.target as Element | null)?.closest?.(OWN_INPUT)) return;
    this.touchY = e.touches[0]?.clientY ?? null;
    this.lastInput = performance.now();
  };
  private onTouchMove = (e: TouchEvent) => {
    if (this.touchY == null) return;
    e.preventDefault();
    const y = e.touches[0]?.clientY ?? this.touchY;
    const d = this.touchY - y;
    this.touchY = y;
    this.nudge(d * INPUT.touch);
  };
  private onTouchEnd = () => {
    this.touchY = null;
  };

  private onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || dialogOpen()) return;
    if ((e.target as Element | null)?.closest?.(OWN_INPUT)) return;
    const stops = this.o.timeline.stops;
    let t: number | undefined;
    if (["ArrowDown", "PageDown", "ArrowRight"].includes(e.key) || (e.key === " " && !e.shiftKey)) t = nextStop(stops, this.T);
    else if (["ArrowUp", "PageUp", "ArrowLeft"].includes(e.key) || (e.key === " " && e.shiftKey)) t = prevStop(stops, this.T);
    else if (e.key === "Home") t = 0;
    else if (e.key === "End") t = this.o.timeline.umax;
    else return;
    // La barre d'espace garde son rôle sur un bouton ou un lien.
    if (e.key === " " && (e.target as Element | null)?.closest?.("button, a")) return;
    e.preventDefault();
    if (t !== undefined) this.goTo(t);
  };

  // Navigation au clavier ou au lecteur d'écran : le focus qui entre dans une autre scène y fait voyager.
  private onFocus = (e: FocusEvent) => {
    const scene = (e.target as Element | null)?.closest?.<HTMLElement>("[data-hx-scene]");
    if (!scene) return;
    const i = this.o.scenes.indexOf(scene);
    if (i >= 0 && i !== this.chapter) this.goToScene(i);
  };

  private tick = (now: number) => {
    this.raf = requestAnimationFrame(this.tick);
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.frameMs = now - (this.last || now);
    this.last = now;
    const { timeline: tl, reduced } = this.o;

    if (now - this.lastInput > SNAP.idle && this.o.pin === undefined) this.T = snapStep(tl.stops, this.T, this.dir, dt);
    this.C += (this.T - this.C) * (reduced ? 1 : perFrame(INPUT.ease, dt));
    if (Math.abs(this.T - this.C) < 2e-4) this.C = this.T;
    const dc = this.C - this.prevC;
    this.prevC = this.C;
    const v = dc / Math.max(dt, 1e-3);
    const kv = perFrame(INPUT.velEase, dt);
    this.vel += (Math.min(1, Math.abs(v) * 0.5) - this.vel) * kv;
    this.vs += (Math.max(-1, Math.min(1, v * 0.5)) - this.vs) * kv;
    if (reduced) this.vel = this.vs = 0;
    this.spin = reduced ? this.spin : this.spin + dt * 6 + dc * 30;

    const frame = layout(tl, this.C, { w: this.w, h: this.h }, { zoom: this.o.zoom, reduced });
    this.last$ = frame;
    this.markNear(sceneAt(tl, this.T));
    this.render(frame);
    this.drawCanvas(frame, dt);

    if (frame.chapter !== this.chapter) {
      const previous = this.chapter;
      this.chapter = frame.chapter;
      this.o.onChapter?.(frame.chapter, previous);
    }
    this.o.onFrame?.(frame, {
      target: this.T,
      u: this.C,
      vel: this.vel,
      vs: this.vs,
      spin: this.spin,
      chapter: this.chapter,
      reduced,
      frameMs: this.frameMs,
      w: this.w,
      h: this.h,
      now,
    });
  };

  /** N'écrit un style que s'il a changé : moins d'invalidations pour le navigateur. */
  private set(el: HTMLElement, prop: string, value: string) {
    let c = this.cache.get(el);
    if (!c) this.cache.set(el, (c = {}));
    if (c[prop] === value) return;
    c[prop] = value;
    if (prop === "data-off") el.toggleAttribute("data-hx-off", value === "1");
    else if (prop.startsWith("--")) el.style.setProperty(prop, value);
    else (el.style as unknown as Record<string, string>)[prop] = value;
  }

  private render(f: Frame) {
    f.scenes.forEach((s, i) => {
      const el = this.o.scenes[i];
      if (!el) return;
      const shown = s.visible && s.opacity > 0.001;
      // Une scène hors champ reste dans l'ordre de tabulation (le focus qui y entre fait voyager jusqu'à elle) :
      // on la rend transparente et inerte à la souris plutôt que `visibility: hidden`. Rien n'est peint.
      this.set(el, "opacity", shown ? s.opacity.toFixed(3) : "0");
      this.set(el, "data-off", shown ? "" : "1");
      if (!shown) return;
      this.set(el, "transformOrigin", `${s.origin[0].toFixed(1)}px ${s.origin[1].toFixed(1)}px`);
      this.set(el, "transform", `translate(${s.tx.toFixed(2)}px, ${s.ty.toFixed(2)}px) scale(${s.scale.toFixed(4)})`);
      this.set(el, "clipPath", s.clip ? `circle(${s.clip.r.toFixed(2)}px at ${s.clip.x.toFixed(2)}px ${s.clip.y.toFixed(2)}px)` : "none");
      this.set(el, "--t", s.text.toFixed(3));
      // Variables lues par les textes (séparation chromatique) et décors de la scène.
      this.set(el, "--vel", this.vel.toFixed(3));
      this.set(el, "--spin", `${(this.spin % 360).toFixed(2)}deg`);
      const photo = this.o.photos?.[i];
      if (photo) {
        const fr = this.frameFor(i, s);
        this.set(photo.el, "transform", `translate(-50%, -50%) translate(${fr.sx.toFixed(1)}px, ${fr.sy.toFixed(1)}px) scale(${fr.k.toFixed(4)})`);
      }
    });

    const { fx, shockRing, restRing, rays } = this.o;
    this.set(fx, "--vel", this.vel.toFixed(3));
    this.set(fx, "--spin", `${(this.spin % 360).toFixed(2)}deg`);
    const shock = f.rings.shock;
    const energy = shock.on ? shock.energy : 0;
    this.set(shockRing, "display", shock.on && !this.o.reduced ? "block" : "none");
    if (shock.on) {
      this.set(shockRing, "--pr", `${shock.r.toFixed(1)}px`);
      this.set(shockRing, "--cx", `${shock.center[0].toFixed(1)}px`);
      this.set(shockRing, "--cy", `${shock.center[1].toFixed(1)}px`);
      this.set(shockRing, "--po", shock.opacity.toFixed(3));
      this.set(shockRing, "--pe", energy.toFixed(3));
    }
    const rest = f.rings.rest;
    this.set(restRing, "display", rest.on && !this.o.reduced ? "block" : "none");
    if (rest.on) {
      this.set(restRing, "--pr", `${rest.r.toFixed(1)}px`);
      this.set(restRing, "--cx", `${rest.center[0].toFixed(1)}px`);
      this.set(restRing, "--cy", `${rest.center[1].toFixed(1)}px`);
      this.set(restRing, "--po", rest.opacity.toFixed(3));
    }
    // Rayons lumineux : seulement pendant le passage (coûteux à peindre en plein écran).
    const raysOn = energy > 0.01 && !this.o.reduced;
    this.set(rays, "display", raysOn ? "block" : "none");
    if (raysOn) {
      this.set(rays, "--pr", `${shock.r.toFixed(1)}px`);
      this.set(rays, "--cx", `${shock.center[0].toFixed(1)}px`);
      this.set(rays, "--cy", `${shock.center[1].toFixed(1)}px`);
      this.set(rays, "opacity", (energy * 0.85).toFixed(3));
    }
    this.energy = energy;
    this.emitter = shock.on ? shock.center : rest.on ? rest.center : [this.w / 2, this.h / 2];
  }

  private energy = 0;
  private color: [number, number, number] = [198, 255, 26];
  private last$: Frame | null = null;
  private near = new Set<number>();

  /** Les photos ne se chargent que pour la scène visée et ses voisines (CSS : [data-hx-near]). */
  private markNear(target: number) {
    for (let i = Math.max(0, target - 1); i <= Math.min(this.o.scenes.length - 1, target + 2); i++) {
      if (this.near.has(i)) continue;
      this.near.add(i);
      this.o.scenes[i]?.setAttribute("data-hx-near", "");
    }
  }

  /** Outil de mise au point : position à l'écran du visage de chaque photo visible. */
  inspect() {
    const f = this.last$;
    if (!f) return [];
    return f.scenes.map((s, i) => {
      const p = this.o.photos?.[i];
      if (!p || !s.visible) return { scene: i, visible: s.visible };
      const fr = this.frameFor(i, s);
      const [lx, ly] = facePoint(p.focal, fr, this.w, this.h);
      const x = s.origin[0] + s.scale * (lx - s.origin[0]) + s.tx;
      const y = s.origin[1] + s.scale * (ly - s.origin[1]) + s.ty;
      return { scene: i, visible: true, face: [Math.round(x), Math.round(y)], clip: s.clip ? Math.round(s.clip.r * s.scale) : null, k: fr.k };
    });
  }

  private frameFor(i: number, s: Frame["scenes"][number]) {
    const p = this.o.photos![i]!;
    const e = s.entering && !this.o.reduced ? s.entering : null;
    return frameImg(p.focal, this.w, this.h, {
      pan: e ? e.pan : 1,
      lx: e ? e.lens[0] : this.w / 2,
      ly: e ? e.lens[1] : this.h / 2,
      rl: e ? e.rLocal : 1e5,
      ent: e ? { sc: e.sc, g: e.center, tx: e.tx, ty: e.ty, s0: e.s0 } : null,
    });
  }
  private emitter: [number, number] = [0, 0];

  private drawCanvas(f: Frame, dt: number) {
    const cv = this.o.canvas;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = cv.width / Math.max(1, this.w);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (this.o.reduced) return;
    void f;
    const speed = 0.1 + this.vs * 2.2 + this.energy * (this.vs < 0 ? -0.6 : 0.9);
    this.stars.draw(ctx, this.w, this.h, dt, speed, this.vel, 0, this.color, this.emitter);
  }
}
