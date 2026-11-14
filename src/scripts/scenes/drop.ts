import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Drop : un flash vert acide à l'entrée, la photo de scène qui glisse, les sets qui rebondissent en place. */
export function dropScene() {
  const section = document.querySelector<HTMLElement>("#drop");
  if (!section) return;
  const flash = section.querySelector<HTMLElement>(".drop__flash");
  const shot = section.querySelector<HTMLElement>(".drop__shot");
  const cards = section.querySelectorAll<HTMLElement>(".drop__sets > li");

  // Un seul flash, bref (jamais répété en rafale).
  if (flash) {
    ScrollTrigger.create({
      trigger: section,
      start: "top 55%",
      onEnter: () => gsap.fromTo(flash, { autoAlpha: 0.85 }, { autoAlpha: 0, duration: 0.5, ease: "klaak" }),
    });
  }
  if (shot) {
    gsap.fromTo(shot, { yPercent: 12, rotate: -2 }, { yPercent: -6, rotate: 1, ease: "none", scrollTrigger: { trigger: shot, start: "top bottom", end: "bottom top", scrub: 0.6 } });
  }
  if (cards.length) {
    gsap.from(cards, { y: 70, autoAlpha: 0, duration: 0.6, ease: "groove", stagger: 0.09, scrollTrigger: { trigger: cards[0], start: "top 88%", once: true } });
  }
}
