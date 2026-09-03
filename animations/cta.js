import { EASE, EASE_EXPO, isMobile } from "./core.js";
function initCta() {
  const band = document.querySelector(".band");
  if (!band) return;
  const kicker = band.querySelector(".kicker");
  const title = band.querySelector("h2");
  const text = band.querySelector("p");
  const field = band.querySelector(".field");
  const go = band.querySelector(".go");
  const left = band.querySelector(".left");
  const right = band.querySelector(".right");
  const y = isMobile() ? 28 : 48;
  const tl = gsap.timeline({
    defaults: { ease: EASE_EXPO },
    scrollTrigger: {
      trigger: band,
      start: "top 80%",
      toggleActions: "play none none none",
      once: true
    }
  });
  if (left) {
    tl.fromTo(
      left,
      { xPercent: isMobile() ? 0 : -6, autoAlpha: 0.4 },
      { xPercent: 0, autoAlpha: 1, duration: 0.9, ease: EASE },
      0
    );
  }
  if (kicker) tl.from(kicker, { y: 20, autoAlpha: 0, duration: 0.45 }, 0.08);
  if (title) tl.from(title, { y, autoAlpha: 0, duration: 0.75 }, 0.14);
  if (text) tl.from(text, { y: 24, autoAlpha: 0, duration: 0.55 }, 0.26);
  if (right) tl.from(right, { autoAlpha: 0, duration: 0.6 }, 0.2);
  if (field) tl.from(field, { y: 16, autoAlpha: 0, duration: 0.45 }, 0.32);
  if (go) {
    tl.from(go, { scale: 0.7, autoAlpha: 0, duration: 0.5, ease: "back.out(1.5)" }, 0.4);
    tl.call(() => {
      gsap.set(go, { clearProps: "transform" });
    });
  }
}
export {
  initCta
};
