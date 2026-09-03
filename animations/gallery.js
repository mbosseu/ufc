import { EASE, EASE_EXPO, qs } from "./core.js";
function initGallery() {
  const section = document.querySelector("[data-motion='gallery']");
  if (!section) {
    qs(".mosaic").forEach(animateMosaic);
    return;
  }
  const bleed = section.querySelector(".ed-bleed");
  const bleedImg = section.querySelector(".ed-bleed-media img");
  const copy = section.querySelector(".ed-bleed-copy");
  const shots = section.querySelectorAll(".ed-shot, .ed-index a");
  if (bleed && bleedImg) {
    gsap.fromTo(
      bleedImg,
      { scale: 1.08 },
      {
        scale: 1,
        duration: 1.5,
        ease: EASE,
        transformOrigin: "center 58%",
        scrollTrigger: {
          trigger: bleed,
          start: "top 82%",
          toggleActions: "play none none none",
          once: true
        }
      }
    );
  }
  if (copy) {
    gsap.from(copy.children, {
      y: 40,
      autoAlpha: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: EASE,
      scrollTrigger: {
        trigger: copy,
        start: "top 80%",
        toggleActions: "play none none none",
        once: true
      }
    });
  }
  if (shots.length) {
    gsap.from(shots, {
      y: 56,
      autoAlpha: 0,
      duration: 0.8,
      stagger: 0.12,
      ease: EASE,
      scrollTrigger: {
        trigger: shots[0],
        start: "top 88%",
        toggleActions: "play none none none",
        once: true
      }
    });
  }
  qs(".mosaic", section).forEach(animateMosaic);
}
function animateMosaic(mosaic) {
  const tiles = mosaic.querySelectorAll(".tile");
  if (!tiles.length) return;
  gsap.from(tiles, {
    autoAlpha: 0,
    y: 36,
    duration: 0.7,
    ease: EASE,
    stagger: 0.1,
    scrollTrigger: {
      trigger: mosaic,
      start: "top 80%",
      toggleActions: "play none none none",
      once: true
    }
  });
}
export {
  initGallery
};
