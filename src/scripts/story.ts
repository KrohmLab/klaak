// Point d'entrée de la narration au scroll. Les scènes sont créées dans l'ordre de la page (important pour
// les sections épinglées). En mode calme, rien n'est créé : la page reste une suite de compositions fixes.
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { initHud } from "./hud";
import { initMotion, reduced } from "./motion";
import { breakdownScene } from "./scenes/breakdown";
import { datesScene } from "./scenes/dates";
import { dropScene } from "./scenes/drop";
import { introScene } from "./scenes/intro";
import { monteeScene } from "./scenes/montee";

export function initStory() {
  if (!reduced()) {
    document.documentElement.classList.add("is-story");
    introScene();
    monteeScene();
    dropScene();
    breakdownScene();
    datesScene();
  }
  initMotion();
  initHud();
  // Les polices et les images décalent la mise en page : on recale les scènes une fois tout chargé.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
}
