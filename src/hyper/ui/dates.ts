// Scène 06 : les affiches en orbite. Position continue `--f` (= date visée, à virgule) calculée depuis `u`,
// date visée arrondie pour la carte surlignée, la fiche et l'année en filigrane.
import type { Engine, EngineState } from "../engine";

export function initDates(stage: HTMLElement, engine: Engine) {
  const scene = stage.querySelector<HTMLElement>(".hx-dates");
  if (!scene) return null;
  const index = [...stage.querySelectorAll("[data-hx-scene]")].indexOf(scene);
  const step = Number(scene.dataset.datesStep);
  const n = Number(scene.dataset.datesCount);
  const years: string[] = JSON.parse(scene.dataset.years ?? "[]");
  const start = engine.timeline.start[index] ?? 0;
  const buttons = [...scene.querySelectorAll<HTMLButtonElement>("[data-date-go]")];
  const cards = buttons.map((b) => b.closest<HTMLElement>(".hx-dcard"));
  const infos = [...scene.querySelectorAll<HTMLElement>("[data-date-info]")];
  const year = scene.querySelector<HTMLElement>("[data-dates-year]");
  let lastF = "";
  let focus = -1;

  buttons.forEach((b) => b.addEventListener("click", () => engine.goTo(start + Number(b.dataset.dateGo) * step)));

  return (s: EngineState) => {
    const f = Math.max(0, Math.min(n, (s.u - start) / step));
    const fs = f.toFixed(4);
    if (fs === lastF) return;
    lastF = fs;
    scene.style.setProperty("--f", fs);
    // Au-delà de 2,6 dates d'écart, la carte sort de l'orbite (sinon, sur téléphone, l'angle fait le tour).
    cards.forEach((c, i) => c?.toggleAttribute("data-far", Math.abs(i - f) > 2.6));
    const k = Math.round(f);
    if (k === focus) return;
    focus = k;
    buttons.forEach((b) => b.classList.toggle("is-on", Number(b.dataset.dateGo) === k));
    infos.forEach((el) => (el.hidden = Number(el.dataset.dateInfo) !== k));
    if (year) year.textContent = years[k] ?? "";
  };
}
