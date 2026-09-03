import { EASE, qs } from "./core.js";

export function initGallery(): void {
  const section = document.querySelector<HTMLElement>("[data-motion='gallery']");
  const mosaics = section
    ? Array.from(section.querySelectorAll<HTMLElement>(".mosaic"))
    : qs(".mosaic");

  mosaics.forEach((mosaic) => {
    const tiles = mosaic.querySelectorAll(".tile");
    if (!tiles.length) return;
    gsap.from(tiles, {
      autoAlpha: 0,
      y: 36,
      scale: 0.97,
      duration: 0.7,
      ease: EASE,
      stagger: 0.1,
      scrollTrigger: {
        trigger: mosaic,
        start: "top 80%",
        toggleActions: "play none none none",
        once: true,
      },
    });
  });
}
