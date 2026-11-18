// Interface fixe : le logo s'envole de l'intro vers le coin haut gauche, se dédouble avec la vitesse, glitche à
// chaque changement de chapitre ; chapitre en cours et jauge de profondeur (spec §6, prototype `frame()`).
import type { EngineState } from "../engine";
import { isNarrow } from "../portal";

const GLITCH_MS = 380;

export function createChrome(stage: HTMLElement, names: string[]) {
  const brand = stage.querySelector<HTMLElement>("[data-hx-brand]");
  const where = stage.querySelector<HTMLElement>("[data-hx-where]");
  const label = stage.querySelector<HTMLElement>("[data-hx-where-label]");
  const depth = stage.querySelector<HTMLElement>("[data-hx-depth]");
  let glAt = -1e9;
  let last = "";

  return {
    chapter(ch: number, previous: number) {
      if (previous >= 0) glAt = performance.now();
      if (label) label.textContent = `${String(ch).padStart(2, "0")} — ${names[ch] ?? ""}`;
    },
    frame(s: EngineState, umax: number) {
      if (!brand) return;
      const { w: W, h: H } = s;
      const narrow = isNarrow(W, H);
      const short = !narrow && H <= 520;
      const L0 = Math.max(0, Math.min(1, s.u / 0.7));
      const L = L0 * L0 * (3 - 2 * L0);
      // Intro : logo géant (centré en écran étroit, à gauche sur ordinateur).
      const heroW = narrow ? Math.min(W * 0.84, 560) : Math.min(W * 0.43, 680, H * 0.9);
      const heroS = heroW / 200;
      const hx = narrow ? (W - heroW) / 2 : W * 0.06;
      const hy = narrow ? H * 0.08 : H * 0.45 - (heroW * 0.705) / 2;
      // Après l'envol : centré en haut en écran étroit (demande de Kevin), en haut à gauche sinon.
      const endS = narrow ? Math.min(0.8, Math.max(0.55, W / 700)) : short ? 0.6 : 1;
      const endX = narrow ? (W - 200 * endS) / 2 : 28;
      const endY = narrow ? 12 : short ? 10 : 18;
      const gl = s.reduced ? 0 : Math.max(0, 1 - (s.now - glAt) / GLITCH_MS);
      const css = [
        `--lx:${(hx + (endX - hx) * L).toFixed(1)}px`,
        `--ly:${(hy + (endY - hy) * L).toFixed(1)}px`,
        `--ls:${(heroS + (endS - heroS) * L).toFixed(4)}`,
        `--vel:${s.vel.toFixed(3)}`,
        `--vs:${s.vs.toFixed(3)}`,
        `--gl:${gl.toFixed(3)}`,
      ].join(";");
      if (css !== last) {
        brand.style.cssText = css;
        last = css;
      }
      where?.style.setProperty("--ls-inv", L.toFixed(3));
      depth?.style.setProperty("--depth", (s.u / Math.max(umax, 1e-6)).toFixed(4));
    },
  };
}
