import gsap from "gsap";

/** Breakdown : tout ralentit. Le portrait se dévoile et dézoome lentement, le texte arrive en douceur. */
export function breakdownScene() {
  const section = document.querySelector<HTMLElement>("#breakdown");
  if (!section) return;
  const portrait = section.querySelector<HTMLElement>(".breakdown__portrait");
  const image = portrait?.querySelector("img");

  if (portrait && image) {
    gsap.fromTo(portrait, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "klaak", scrollTrigger: { trigger: portrait, start: "top 80%", once: true } });
    gsap.fromTo(image, { scale: 1.25 }, { scale: 1, ease: "none", scrollTrigger: { trigger: portrait, start: "top bottom", end: "bottom top", scrub: 1 } });
  }
  gsap.from(section.querySelectorAll(".bio-switch, .bio:not([hidden]), .breakdown__facts"), {
    y: 24,
    autoAlpha: 0,
    duration: 1.2,
    ease: "klaak",
    stagger: 0.15,
    scrollTrigger: { trigger: section.querySelector(".bio-switch"), start: "top 88%", once: true },
  });
}
