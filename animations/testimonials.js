import { EASE, EASE_EXPO, qs } from "./core.js";
function initTestimonials() {
  qs(".callout").forEach((box) => {
    gsap.from(box, {
      autoAlpha: 0,
      y: 28,
      duration: 0.8,
      ease: EASE_EXPO,
      scrollTrigger: {
        trigger: box,
        start: "top 84%",
        toggleActions: "play none none none",
        once: true
      }
    });
  });
  qs("blockquote").forEach((quote) => {
    gsap.from(quote, {
      autoAlpha: 0,
      y: 28,
      duration: 0.75,
      ease: EASE,
      scrollTrigger: {
        trigger: quote,
        start: "top 86%",
        toggleActions: "play none none none",
        once: true
      }
    });
  });
  qs(".ed-portrait").forEach((portrait) => {
    const media = portrait.querySelector(".ed-portrait-media");
    const img = portrait.querySelector(".ed-portrait-media img");
    const copy = portrait.querySelector(".ed-portrait-copy");
    if (media) {
      gsap.fromTo(
        media,
        { clipPath: "inset(8% 6% 8% 6%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.25,
          ease: EASE_EXPO,
          scrollTrigger: {
            trigger: portrait,
            start: "top 82%",
            toggleActions: "play none none none",
            once: true
          }
        }
      );
    }
    if (img) {
      gsap.fromTo(
        img,
        { scale: 1.12 },
        {
          scale: 1,
          duration: 1.4,
          ease: EASE,
          scrollTrigger: {
            trigger: portrait,
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
        duration: 0.75,
        stagger: 0.1,
        ease: EASE,
        scrollTrigger: {
          trigger: portrait,
          start: "top 70%",
          toggleActions: "play none none none",
          once: true
        }
      });
    }
  });
}
export {
  initTestimonials
};
