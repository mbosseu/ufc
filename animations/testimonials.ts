import { EASE, EASE_EXPO, clearTransform, qs } from "./core.js";

export function initTestimonials(): void {
  qs(".callout").forEach((box) => {
    gsap.from(box, {
      autoAlpha: 0,
      y: 36,
      scale: 0.98,
      duration: 0.8,
      ease: EASE_EXPO,
      scrollTrigger: {
        trigger: box,
        start: "top 84%",
        toggleActions: "play none none none",
        once: true,
      },
    });
  });

  qs("blockquote").forEach((quote) => {
    gsap.from(quote, {
      autoAlpha: 0,
      y: 28,
      scale: 0.985,
      duration: 0.75,
      ease: EASE,
      scrollTrigger: {
        trigger: quote,
        start: "top 86%",
        toggleActions: "play none none none",
        once: true,
      },
    });
  });

  const portrait = document.querySelector("[data-motion='quotes']");
  if (!portrait) return;

  const head = portrait.querySelector(".head");
  const card = portrait.querySelector(".card");
  const media = portrait.querySelector(".media img");
  const body = portrait.querySelector(".card-body");

  const tl = gsap.timeline({
    defaults: { ease: EASE_EXPO },
    scrollTrigger: {
      trigger: portrait,
      start: "top 78%",
      toggleActions: "play none none none",
      once: true,
    },
  });

  if (head) tl.from(head.children, { y: 32, autoAlpha: 0, duration: 0.65, stagger: 0.08 }, 0);
  if (card) {
    tl.from(card, { y: 48, autoAlpha: 0, scale: 0.97, duration: 0.9 }, 0.12);
    tl.call(() => clearTransform(card));
  }
  if (media) tl.fromTo(media, { scale: 1.1 }, { scale: 1, duration: 1.1, ease: EASE }, 0.18);
  if (body) {
    tl.from(body.children, { y: 18, autoAlpha: 0, duration: 0.5, stagger: 0.08 }, 0.32);
  }
}
