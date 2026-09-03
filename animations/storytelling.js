import { EASE, EASE_EXPO } from "./core.js";
function initStorytelling() {
  const section = document.querySelector("[data-motion='story']");
  if (!section) return;
  const photo = section.querySelector(".split-photo");
  const copy = section.querySelector("[data-story='copy']");
  const cta = section.querySelector("[data-story='cta']");
  const rows = section.querySelectorAll(".split-list .row");
  if (photo) {
    gsap.fromTo(
      photo,
      { scale: 1.08 },
      {
        scale: 1,
        duration: 1.35,
        ease: EASE,
        transformOrigin: "center center",
        scrollTrigger: {
          trigger: section,
          start: "top 80%",
          toggleActions: "play none none none",
          once: true
        }
      }
    );
  }
  const introBits = [copy, cta].filter(Boolean);
  if (introBits.length) {
    gsap.from(introBits, {
      y: 36,
      autoAlpha: 0,
      duration: 0.75,
      stagger: 0.12,
      ease: EASE_EXPO,
      scrollTrigger: {
        trigger: section,
        start: "top 78%",
        toggleActions: "play none none none",
        once: true
      }
    });
  }
  if (rows.length) {
    gsap.from(rows, {
      x: 28,
      autoAlpha: 0,
      duration: 0.6,
      stagger: 0.1,
      ease: EASE,
      scrollTrigger: {
        trigger: section.querySelector(".split-list") || section,
        start: "top 82%",
        toggleActions: "play none none none",
        once: true
      }
    });
  }
}
export {
  initStorytelling
};
