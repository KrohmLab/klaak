// Scène 05 : choix du set. Choisir un set recolore tout le site (--wc) et les étoiles.
// La lecture SoundCloud s'ajoute à l'étape 4.
import type { Engine } from "../engine";

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export type SetInfo = { title: string; sub: string; url: string; color: string };

export function initSets(stage: HTMLElement, engine: Engine) {
  const scene = stage.querySelector<HTMLElement>("[data-sets]");
  if (!scene) return;
  const sets: SetInfo[] = JSON.parse(scene.dataset.sets ?? "[]");
  const sceneIndex = [...stage.querySelectorAll("[data-hx-scene]")].indexOf(scene);
  const arts = [...scene.querySelectorAll<HTMLElement>("[data-set-art]")];
  const picks = [...scene.querySelectorAll<HTMLButtonElement>("[data-set-pick]")];
  const title = scene.querySelector("[data-np-title]");
  const sub = scene.querySelector("[data-np-sub]");
  const link = scene.querySelector<HTMLAnchorElement>("[data-np-link]");
  const big = scene.querySelector<HTMLButtonElement>("[data-hx-playbig]");
  const listen = big?.getAttribute("aria-label")?.split(" : ")[0] ?? "";

  const select = (i: number) => {
    const s = sets[i];
    if (!s) return;
    stage.style.setProperty("--wc", s.color);
    engine.setColor(hexToRgb(s.color));
    arts.forEach((a) => (a.style.opacity = a.dataset.setArt === String(i) ? "1" : "0"));
    picks.forEach((p) => {
      const on = p.dataset.setPick === String(i);
      p.classList.toggle("is-on", on);
      p.setAttribute("aria-pressed", String(on));
    });
    if (title) title.textContent = s.title;
    if (sub) sub.textContent = s.sub;
    if (link) link.href = s.url;
    big?.setAttribute("aria-label", `${listen} : ${s.title}`);
  };

  picks.forEach((p) => p.addEventListener("click", () => select(Number(p.dataset.setPick))));
  // Le gros bouton se voit aussi depuis la scène 04, dans le portail : il fait d'abord voyager jusqu'aux sets.
  big?.addEventListener("click", () => {
    if (engine.currentChapter !== sceneIndex) engine.goToScene(sceneIndex);
  });
  select(0);
}
