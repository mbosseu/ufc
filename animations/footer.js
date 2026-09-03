import { EASE, EASE_EXPO, isMobile } from "./core.js";
function initFooter() {
  const footer = document.querySelector("footer.site");
  if (!footer) return;
  const brand = footer.querySelector(".foot .brand");
  const cols = footer.querySelectorAll(".foot-cols > div");
  const legal = footer.querySelector(".legal");
  const y = isMobile() ? 24 : 40;
  const tl = gsap.timeline({
    defaults: { ease: EASE_EXPO },
    scrollTrigger: {
      trigger: footer,
      start: "top 88%",
      toggleActions: "play none none none",
      once: true
    }
  });
  if (brand) tl.from(brand, { y, autoAlpha: 0, duration: 0.65 }, 0);
  if (cols.length) {
    tl.from(cols, { y: y * 0.7, autoAlpha: 0, duration: 0.6, stagger: 0.08 }, 0.1);
  }
  if (legal) {
    tl.from(legal, { y: 16, autoAlpha: 0, duration: 0.5, ease: EASE }, 0.28);
  }
  if (!isMobile() && brand) {
    gsap.to(brand, {
      y: -18,
      ease: "none",
      scrollTrigger: {
        trigger: footer,
        start: "top bottom",
        end: "bottom bottom",
        scrub: true
      }
    });
  }
}
export {
  initFooter
};
