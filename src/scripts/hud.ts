// HUD vivant : chapitre en cours, avancement et forme d'onde suivent le scroll.
// Indépendant de GSAP : fonctionne aussi en mode calme.
export function initHud() {
  const hud = document.querySelector<HTMLElement>('[data-hud="live"]');
  if (!hud) return;
  const sections = [...document.querySelectorAll<HTMLElement>("[data-chapter]")];
  const marks = [...hud.querySelectorAll<HTMLAnchorElement>(".hud__marks a")];
  const bars = [...hud.querySelectorAll<HTMLElement>(".hud__wave > i")];
  const index = hud.querySelector("[data-hud-index]");
  const label = hud.querySelector("[data-hud-label]");
  const pct = hud.querySelector("[data-hud-pct]");
  let lit = -1;
  let current = -1;
  let queued = false;

  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    const on = Math.round(progress * bars.length);
    if (on !== lit) {
      bars.forEach((bar, i) => bar.classList.toggle("on", i < on));
      lit = on;
      if (pct) pct.textContent = String(Math.round(progress * 100)).padStart(3, "0");
    }
    let now = 0;
    sections.forEach((section, i) => {
      if (section.getBoundingClientRect().top <= window.innerHeight * 0.5) now = i;
    });
    if (now !== current) {
      current = now;
      if (index) index.textContent = String(now + 1).padStart(2, "0");
      if (label) label.textContent = marks[now]?.dataset.label ?? "";
      marks.forEach((mark, i) => (i === now ? mark.setAttribute("aria-current", "true") : mark.removeAttribute("aria-current")));
    }
  };
  const request = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  update();
}
