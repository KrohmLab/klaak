import gsap from "gsap";
import { klaak } from "../motion";

/** Intro : le logo claque au chargement, puis le scroll nous fait passer à travers. */
export function introScene() {
  const section = document.querySelector<HTMLElement>("#intro");
  const logo = section?.querySelector<HTMLElement>(".intro__logo");
  const kick = section?.querySelector<HTMLElement>(".intro__kick");
  if (!section || !logo || !kick) return;

  klaak(kick);
  gsap
    .timeline({ scrollTrigger: { trigger: section, start: "top top", end: "+=90%", pin: true, scrub: 0.4 } })
    .to(section.querySelectorAll(".intro__meta, .intro__cue"), { autoAlpha: 0, y: -30, duration: 0.25 }, 0)
    .fromTo(logo, { "--shift": "0.035em" }, { "--shift": "0.45em", ease: "rise", duration: 1 }, 0)
    .to(logo, { scale: 4.5, ease: "rise", duration: 1 }, 0)
    .to(logo, { autoAlpha: 0, ease: "rise", duration: 0.45 }, 0.55);
}
