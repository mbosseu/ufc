import { EASE, EASE_EXPO } from "./core.js";
function initHeader() {
  const header = document.querySelector("body > header");
  if (!header) return;
  gsap.set(header, { autoAlpha: 0, y: -30 });
  const logo = header.querySelector(".brand img");
  const links = header.querySelectorAll("nav.main a");
  const cta = header.querySelector(".cta");
  const burger = header.querySelector(".burger");
  const tl = gsap.timeline({ defaults: { ease: EASE_EXPO } });
  tl.to(header, { autoAlpha: 1, y: 0, duration: 0.7 }, 0);
  if (logo) {
    gsap.set(logo, { scale: 0.92, transformOrigin: "left center" });
    tl.to(logo, { scale: 1, duration: 0.8, ease: EASE }, 0.12);
  }
  if (links.length) {
    tl.from(
      links,
      { y: -16, autoAlpha: 0, duration: 0.45, stagger: 0.06, ease: EASE },
      0.22
    );
    tl.call(() => {
      gsap.set(links, { clearProps: "opacity,visibility,transform" });
    });
  }
  if (cta) {
    tl.from(cta, { y: -12, autoAlpha: 0, scale: 0.96, duration: 0.45 }, 0.4);
    tl.call(() => {
      gsap.set(cta, { clearProps: "transform" });
    });
  }
  if (burger) {
    tl.from(burger, { autoAlpha: 0, duration: 0.35 }, 0.28);
  }
  ScrollTrigger.create({
    start: 24,
    end: "max",
    onEnter: () => header.classList.add("is-compact"),
    onLeaveBack: () => header.classList.remove("is-compact")
  });
}
export {
  initHeader
};
