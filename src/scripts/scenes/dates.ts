import gsap from "gsap";

/** Montée finale : sur grand écran, la frise des dates est épinglée et défile à l'horizontale avec le scroll. */
export function datesScene() {
  const section = document.querySelector<HTMLElement>("#dates");
  const viewport = section?.querySelector<HTMLElement>(".dates__viewport");
  const track = section?.querySelector<HTMLElement>(".dates__track");
  if (!section || !viewport || !track) return;

  gsap.matchMedia().add("(min-width: 64rem) and (min-height: 40rem)", () => {
    document.documentElement.classList.add("is-pinned-dates");
    viewport.scrollLeft = 0;
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: { trigger: section, start: "top top", end: () => `+=${distance()}`, pin: true, scrub: 0.5, invalidateOnRefresh: true },
    });
    // Au clavier, la carte qui reçoit le focus doit être visible : on amène le scroll à sa position dans la frise.
    const onFocus = (event: FocusEvent) => {
      const item = (event.target as HTMLElement).closest<HTMLElement>(".dates__track > li");
      const trigger = tween.scrollTrigger;
      if (!item || !trigger) return;
      const ratio = distance() > 0 ? Math.min(1, item.offsetLeft / distance()) : 0;
      window.scrollTo({ top: trigger.start + ratio * (trigger.end - trigger.start) });
    };
    track.addEventListener("focusin", onFocus);
    return () => {
      track.removeEventListener("focusin", onFocus);
      document.documentElement.classList.remove("is-pinned-dates");
    };
  });
}
