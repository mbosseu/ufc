import { EASE, EASE_EXPO } from "./core.js";

export function initStorytelling(): void {
  const section = document.querySelector<HTMLElement>("[data-motion='story']");
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
        duration: 1,
        ease: EASE,
        scrollTrigger: {
          trigger: section,
          start: "top 80%",
          toggleActions: "play none none none",
          once: true,
        },
      }
    );
  }

  const introBits = [copy, cta].filter(Boolean);
  if (introBits.length) {
    gsap.from(introBits, {
      y: 32,
      autoAlpha: 0,
      duration: 0.7,
      stagger: 0.12,
      ease: EASE_EXPO,
      scrollTrigger: {
        trigger: section,
        start: "top 78%",
        toggleActions: "play none none none",
        once: true,
      },
    });
  }

  if (rows.length) {
    gsap.from(rows, {
      y: 24,
      autoAlpha: 0,
      duration: 0.55,
      stagger: 0.1,
      ease: EASE,
      scrollTrigger: {
        trigger: section.querySelector(".split-list") || section,
        start: "top 82%",
        toggleActions: "play none none none",
        once: true,
      },
    });
  }
}
