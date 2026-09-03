import { EASE, clearTransform, isMobile, qs } from "./core.js";
function initServices() {
  const y = isMobile() ? 36 : 60;
  qs(".cards, .grid-3, .grid-2").forEach((grid) => {
    if (grid.closest("[data-motion='gallery']")) return;
    const cards = Array.from(grid.querySelectorAll(".card")).filter(
      (card) => !card.closest("[data-motion='quotes']")
    );
    if (!cards.length) return;
    gsap.from(cards, {
      autoAlpha: 0,
      y,
      scale: 0.96,
      duration: 0.85,
      ease: EASE,
      stagger: 0.1,
      scrollTrigger: {
        trigger: grid,
        start: "top 80%",
        toggleActions: "play none none none",
        once: true
      },
      onComplete: () => clearTransform(cards)
    });
  });
  qs(".list-cards").forEach((list) => {
    const items = list.querySelectorAll(".list-item");
    if (!items.length) return;
    gsap.from(items, {
      autoAlpha: 0,
      y: isMobile() ? 28 : 48,
      x: isMobile() ? 0 : -24,
      duration: 0.75,
      ease: EASE,
      stagger: 0.09,
      scrollTrigger: {
        trigger: list,
        start: "top 82%",
        toggleActions: "play none none none",
        once: true
      },
      onComplete: () => clearTransform(items)
    });
  });
  const seen = /* @__PURE__ */ new Set();
  qs(".rank-row").forEach((row) => {
    const parent = row.parentElement;
    if (!parent || seen.has(parent)) return;
    seen.add(parent);
    const rows = parent.querySelectorAll(".rank-row");
    gsap.from(rows, {
      autoAlpha: 0,
      x: isMobile() ? 0 : 32,
      y: 20,
      duration: 0.6,
      ease: EASE,
      stagger: 0.07,
      scrollTrigger: {
        trigger: parent,
        start: "top 84%",
        toggleActions: "play none none none",
        once: true
      }
    });
  });
}
export {
  initServices
};
