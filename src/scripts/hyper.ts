// Démarrage du voyage : lit les scènes dans le DOM (attributs data-hx-*), construit la timeline, lance le moteur.
// Les paramètres de chaque scène vivent dans le HTML généré par Astro, donc dans les données du site.
import { Engine, type EngineOptions } from "../hyper/engine";
import { buildTimeline, type SceneSpec } from "../hyper/timeline";

/** Positions de portail nommées. `intro` : décalé à droite (74 %, 46 %), sous le logo sur mobile (50 %, 64 %). */
const PORTALS: Record<string, SceneSpec["portal"]> = {
  center: undefined,
  intro: (w, h) => (w < 760 ? [w * 0.5, h * 0.64] : [w * 0.74, h * 0.46]),
};

const num = (v: string | undefined, fallback: number) => (v === undefined || v === "" || Number.isNaN(Number(v)) ? fallback : Number(v));

export type HyperOptions = Pick<EngineOptions, "onFrame" | "onChapter" | "pin"> & { zoom?: number; reduced?: boolean };

export function initHyper(opts: HyperOptions = {}): Engine | null {
  const root = document.querySelector<HTMLElement>("[data-hx-stage]");
  if (!root) return null;
  const sections = [...root.querySelectorAll<HTMLElement>("[data-hx-scene]")];
  const specs: SceneSpec[] = sections.map((el) => ({
    id: el.id,
    len: num(el.dataset.hxLen, 1),
    stops: el.dataset.hxStops ? el.dataset.hxStops.split(",").map(Number) : undefined,
    preview: el.dataset.hxPreview !== undefined,
    s0: num(el.dataset.hxS0, 0.52),
    portal: PORTALS[el.dataset.hxPortal ?? "center"],
  }));
  const q = <T extends Element>(sel: string) => {
    const el = root.querySelector<T>(sel);
    if (!el) throw new Error(`Élément manquant : ${sel}`);
    return el;
  };

  const reduced = opts.reduced ?? "calm" in document.documentElement.dataset;
  document.documentElement.classList.add("hx-on");
  sections.forEach((el, i) => (el.style.zIndex = String(2 + i)));

  const engine = new Engine({
    root,
    timeline: buildTimeline(specs),
    scenes: sections,
    fx: q<HTMLElement>("[data-hx-fx]"),
    shockRing: q<HTMLElement>('[data-hx-ring="shock"]'),
    restRing: q<HTMLElement>('[data-hx-ring="rest"]'),
    rays: q<HTMLElement>("[data-hx-rays]"),
    canvas: q<HTMLCanvasElement>("[data-hx-canvas]"),
    zoom: opts.zoom,
    reduced,
    pin: opts.pin,
    onFrame: opts.onFrame,
    onChapter: opts.onChapter,
  });

  // Liens internes (#scene) : on voyage au lieu de sauter.
  document.addEventListener("click", (e) => {
    const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="#"]');
    const i = a ? sections.findIndex((s) => `#${s.id}` === a.getAttribute("href")) : -1;
    if (i < 0) return;
    e.preventDefault();
    engine.goToScene(i);
  });
  return engine;
}
