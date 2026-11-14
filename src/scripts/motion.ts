// Patterns de motion du site. Tout passe par ici pour rester cohérent et respecter prefers-reduced-motion.
// Principe : le HTML est lisible sans JS ; les états de départ (masqué, décalé) ne sont posés que par GSAP.
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(CustomEase, ScrollTrigger, SplitText);

// Mêmes courbes que les tokens CSS (--ease-*).
CustomEase.create("klaak", "0.16, 1, 0.3, 1");
CustomEase.create("rise", "0.7, 0, 0.84, 0");
CustomEase.create("groove", "0.34, 1.56, 0.64, 1");

export const DUR = { snap: 0.12, klaak: 0.32, move: 0.6, slow: 1.2 } as const;
const REST_SHIFT = "0.035em";

export const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** La claque : l'élément arrive trop gros, trop décalé, surexposé, et se pose net. */
export function klaak(el: Element) {
  if (reduced()) return gsap.fromTo(el, { opacity: 0.4 }, { opacity: 1, duration: DUR.klaak });
  return gsap.fromTo(
    el,
    { scale: 1.28, "--shift": "0.24em", filter: "brightness(2.4)" },
    { scale: 1, "--shift": REST_SHIFT, filter: "brightness(1)", duration: DUR.klaak, ease: "klaak", clearProps: "scale,filter,--shift" },
  );
}

/** Révélation : les mots montent ligne par ligne derrière un masque. */
export function splitReveal(el: Element) {
  if (reduced()) return gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: DUR.move });
  const split = SplitText.create(el, { type: "lines,words", mask: "lines" });
  return gsap.from(split.words, {
    yPercent: 115,
    duration: DUR.move,
    ease: "klaak",
    stagger: 0.035,
    onComplete: () => split.revert(),
  });
}

/** La montée : grossit et se resserre en accélérant, pour finir sur une claque. */
export function rise(el: Element) {
  if (reduced()) return gsap.fromTo(el, { opacity: 0.4 }, { opacity: 1, duration: DUR.klaak });
  return gsap
    .timeline()
    .fromTo(el, { scale: 0.35, letterSpacing: "0.3em", opacity: 0.35 }, { scale: 1, letterSpacing: "-0.045em", opacity: 1, duration: DUR.slow, ease: "rise", clearProps: "letterSpacing" })
    .add(klaak(el));
}

/** Secousse glitch courte (CSS), pour les retours d'interaction. */
export function glitch(el: Element) {
  el.classList.remove("is-glitching");
  void (el as HTMLElement).offsetWidth;
  el.classList.add("is-glitching");
  el.addEventListener("animationend", () => el.classList.remove("is-glitching"), { once: true });
}

const PATTERNS = { klaak, split: splitReveal, rise, glitch } as const;
type Pattern = keyof typeof PATTERNS;
const isPattern = (name: string | undefined): name is Pattern => !!name && name in PATTERNS;

/** Le décalage chromatique suit la vitesse du scroll, puis retombe à sa valeur de repos. */
function velocityShift() {
  if (reduced()) return;
  const root = document.documentElement;
  const state = { v: 0 };
  const apply = () => root.style.setProperty("--shift", `${(0.035 + state.v).toFixed(3)}em`);
  ScrollTrigger.create({
    onUpdate: (self) => {
      state.v = Math.min(Math.abs(self.getVelocity()) / 9000, 0.22);
      apply();
      gsap.to(state, { v: 0, duration: DUR.move, ease: "klaak", overwrite: true, onUpdate: apply });
    },
  });
}

/**
 * Branche les attributs déclaratifs :
 *   data-motion="klaak|split|rise|glitch"  → joué une fois à l'entrée dans l'écran
 *   data-replay="#cible"                    → bouton qui rejoue le pattern de la cible
 */
export function initMotion() {
  document.querySelectorAll<HTMLElement>("[data-motion]").forEach((el) => {
    const name = el.dataset.motion;
    if (!isPattern(name)) return;
    ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: () => PATTERNS[name](el) });
  });
  document.querySelectorAll<HTMLElement>("[data-replay]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = document.querySelector<HTMLElement>(button.dataset.replay ?? "");
      const name = target?.dataset.motion;
      if (target && isPattern(name)) PATTERNS[name](target);
    });
  });
  velocityShift();
}
