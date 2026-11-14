import gsap from "gsap";

/** Montée : chaque phrase arrive, puis explose vers nous pour laisser place à la suivante. */
export function monteeScene() {
  const section = document.querySelector<HTMLElement>("#montee");
  if (!section) return;
  const steps = [...section.querySelectorAll<HTMLElement>(".montee__step")];
  const bg = section.querySelector<HTMLElement>(".montee__bg");

  const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: "top top", end: "+=320%", pin: true, scrub: 0.5 } });
  if (bg) tl.fromTo(bg, { clipPath: "inset(50% 0% 50% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "none", duration: steps.length * 1.6 }, 0);

  steps.forEach((step, i) => {
    const at = i * 1.6;
    const big = step.classList.contains("t-mega");
    tl.fromTo(
      step,
      { autoAlpha: 0, scale: big ? 0.25 : 0.6, letterSpacing: big ? "0.25em" : "0em" },
      { autoAlpha: 1, scale: 1, letterSpacing: big ? "-0.045em" : "0em", ease: big ? "rise" : "klaak", duration: 1 },
      at,
    );
    if (big) tl.fromTo(step, { "--shift": "0.3em" }, { "--shift": "0.035em", ease: "rise", duration: 1 }, at);
    // La dernière phrase reste à l'écran : c'est elle qui lance le drop.
    if (i < steps.length - 1) tl.to(step, { autoAlpha: 0, scale: 1.7, ease: "rise", duration: 0.6 }, at + 1);
  });
}
