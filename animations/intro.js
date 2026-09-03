import { EASE, EASE_EXPO, isMobile, qs, revealOnce } from "./core.js";
function initIntro() {
  const intro = document.querySelector("[data-motion='intro']");
  if (intro) {
    const kicker = intro.querySelector(".ed-head .kicker, .head .kicker");
    const title = intro.querySelector(".ed-head h2, .head h2, .head h1");
    const more = intro.querySelector(".ed-head .more, .head .more");
    const lede = intro.querySelector(".lede");
    const lead = intro.querySelector(".ed-lead");
    const leadImg = intro.querySelector(".ed-lead-media img");
    const aside = intro.querySelectorAll(".ed-aside-item");
    const yTitle = isMobile() ? 36 : 64;
    const tl = gsap.timeline({
      defaults: { ease: EASE_EXPO },
      scrollTrigger: {
        trigger: intro,
        start: "top 82%",
        toggleActions: "play none none none",
        once: true
      }
    });
    if (kicker) tl.from(kicker, { y: 20, autoAlpha: 0, duration: 0.5 }, 0);
    if (title) tl.from(title, { y: yTitle, autoAlpha: 0, duration: 0.9 }, 0.06);
    if (more) tl.from(more, { x: 12, autoAlpha: 0, duration: 0.45 }, 0.16);
    if (lede) tl.from(lede, { y: 28, autoAlpha: 0, duration: 0.7 }, 0.18);
    if (leadImg && lead) {
      gsap.fromTo(
        leadImg,
        { scale: 1.12, yPercent: -6 },
        {
          scale: 1,
          yPercent: 0,
          duration: 1.4,
          ease: EASE,
          scrollTrigger: {
            trigger: lead,
            start: "top 85%",
            toggleActions: "play none none none",
            once: true
          }
        }
      );
      gsap.fromTo(
        lead,
        { clipPath: "inset(12% 8% 12% 8%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.25,
          ease: EASE_EXPO,
          scrollTrigger: {
            trigger: lead,
            start: "top 88%",
            toggleActions: "play none none none",
            once: true
          }
        }
      );
    }
    if (aside.length) {
      gsap.from(aside, {
        y: 40,
        autoAlpha: 0,
        duration: 0.75,
        stagger: 0.12,
        ease: EASE,
        scrollTrigger: {
          trigger: aside[0],
          start: "top 86%",
          toggleActions: "play none none none",
          once: true
        }
      });
    }
  }
  revealEditorial();
  revealArticles();
  parallaxVisuals();
}
function revealEditorial() {
  qs(".ed-lead").forEach((lead) => {
    if (lead.closest("[data-motion='intro']")) return;
    const img = lead.querySelector("img");
    gsap.fromTo(
      lead,
      { clipPath: "inset(10% 6% 10% 6%)" },
      {
        clipPath: "inset(0% 0% 0% 0%)",
        duration: 1.2,
        ease: EASE_EXPO,
        scrollTrigger: {
          trigger: lead,
          start: "top 88%",
          toggleActions: "play none none none",
          once: true
        }
      }
    );
    if (img) {
      gsap.fromTo(
        img,
        { scale: 1.1 },
        {
          scale: 1,
          duration: 1.35,
          ease: EASE,
          scrollTrigger: {
            trigger: lead,
            start: "top 88%",
            toggleActions: "play none none none",
            once: true
          }
        }
      );
    }
  });
  qs(".hub-index a, .hub-index .row-static").forEach((row, i) => {
    revealOnce(row, { y: 24, autoAlpha: 0, duration: 0.55, ease: EASE, delay: i * 0.03 }, row, "top 90%");
  });
  qs(".roster a").forEach((cell) => {
    gsap.fromTo(
      cell,
      { clipPath: "inset(8% 8% 8% 8%)", autoAlpha: 0.4 },
      {
        clipPath: "inset(0% 0% 0% 0%)",
        autoAlpha: 1,
        duration: 0.9,
        ease: EASE,
        scrollTrigger: {
          trigger: cell,
          start: "top 88%",
          toggleActions: "play none none none",
          once: true
        }
      }
    );
  });
  qs(".ed-keys-list a").forEach((row) => {
    revealOnce(row, { x: isMobile() ? 0 : 28, autoAlpha: 0, duration: 0.6, ease: EASE }, row, "top 90%");
  });
}
function revealArticles() {
  const article = document.querySelector(".article");
  if (!article) return;
  const ah = article.querySelector("header.ah");
  const crumbs = article.querySelector(".crumbs");
  const figure = article.querySelector(".figure img");
  if (crumbs) {
    gsap.from(crumbs, { y: 16, autoAlpha: 0, duration: 0.45, ease: EASE });
  }
  if (ah) {
    const bits = ah.querySelectorAll(".kicker, h1, .byline");
    gsap.from(bits, {
      y: 48,
      autoAlpha: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: EASE_EXPO,
      delay: 0.08
    });
  }
  if (figure) {
    const frame = figure.closest(".figure");
    gsap.fromTo(
      frame,
      { clipPath: "inset(0 12% 0 12%)" },
      { clipPath: "inset(0 0% 0 0%)", duration: 1.2, ease: EASE_EXPO, delay: 0.12, onComplete: () => gsap.set(frame, { clearProps: "clipPath" }) }
    );
    gsap.fromTo(
      figure,
      { scale: 1.12 },
      { scale: 1, duration: 1.35, ease: EASE, delay: 0.12 }
    );
  }
  qs(".prose h2", article).forEach((h) => {
    revealOnce(h, { y: 28, autoAlpha: 0, duration: 0.6, ease: EASE }, h, "top 86%");
  });
}
function parallaxVisuals() {
  const amount = isMobile() ? 8 : 16;
    qs(".split-photo, .ed-lead-media img, .ed-bleed-media img, .ed-portrait-media img, .ed-keys-photo img, .org-lead-photo img").forEach((img) => {
    const frame = img.parentElement;
    if (!frame) return;
    gsap.fromTo(
      img,
      { yPercent: -amount },
      {
        yPercent: amount,
        ease: "none",
        scrollTrigger: {
          trigger: frame,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      }
    );
  });
  qs(".figure img").forEach((img) => {
    const frame = img.closest(".figure");
    if (!frame) return;
    gsap.fromTo(
      img,
      { yPercent: -amount * 0.6, scale: 1.08 },
      {
        yPercent: amount * 0.6,
        scale: 1.08,
        ease: "none",
        scrollTrigger: {
          trigger: frame,
          start: "top bottom",
          end: "bottom top",
          scrub: true
        }
      }
    );
  });
}
export {
  initIntro
};
