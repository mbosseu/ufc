import { EASE, EASE_EXPO, isMobile, qs, revealOnce } from "./core.js";

export function initIntro(): void {
  const intro = document.querySelector("[data-motion='intro']");
  if (intro) {
    const kicker = intro.querySelector(".head .kicker");
    const title = intro.querySelector(".head h2, .head h1");
    const more = intro.querySelector(".head .more");
    const lede = intro.querySelector(".lede");
    const image = intro.querySelector(".card .media img, .figure img");

    const yTitle = isMobile() ? 36 : 60;
    const yText = isMobile() ? 24 : 40;

    const tl = gsap.timeline({
      defaults: { ease: EASE_EXPO },
      scrollTrigger: {
        trigger: intro,
        start: "top 78%",
        toggleActions: "play none none none",
        once: true,
      },
    });

    if (kicker) tl.from(kicker, { y: 24, autoAlpha: 0, duration: 0.5 }, 0);
    if (title) tl.from(title, { y: yTitle, autoAlpha: 0, duration: 0.85 }, 0.08);
    if (more) tl.from(more, { x: 16, autoAlpha: 0, duration: 0.45 }, 0.18);
    if (lede) tl.from(lede, { y: yText, autoAlpha: 0, duration: 0.7 }, 0.22);
    if (image) {
      tl.fromTo(
        image,
        { scale: 1.08 },
        {
          scale: 1,
          duration: 1.1,
          ease: EASE,
          onComplete: () => gsap.set(image, { clearProps: "transform" }),
        },
        0.28
      );
    }
  }

  revealArticles();
  parallaxVisuals();
}

function revealArticles(): void {
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
      y: 40,
      autoAlpha: 0,
      duration: 0.75,
      stagger: 0.1,
      ease: EASE_EXPO,
      delay: 0.08,
    });
  }

  if (figure) {
    gsap.fromTo(
      figure,
      { scale: 1.08, autoAlpha: 0.35 },
      { scale: 1, autoAlpha: 1, duration: 1.15, ease: EASE, delay: 0.15 }
    );
  }

  qs(".prose h2", article).forEach((h) => {
    revealOnce(h, { y: 28, autoAlpha: 0, duration: 0.6, ease: EASE }, h, "top 86%");
  });
}

function parallaxVisuals(): void {
  const amount = isMobile() ? 6 : 14;

  qs<HTMLElement>(".split-photo").forEach((img) => {
    if (img.closest("[data-motion='story']")) return;
    const frame = img.closest(".split-dark") || img.parentElement;
    if (!frame) return;
    gsap.fromTo(
      img,
      { yPercent: -amount, scale: 1.12 },
      {
        yPercent: amount,
        scale: 1.12,
        ease: "none",
        scrollTrigger: {
          trigger: frame,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );
  });

  qs<HTMLElement>(".figure img").forEach((img) => {
    const frame = img.closest(".figure");
    if (!frame) return;
    gsap.fromTo(
      img,
      { yPercent: -amount, scale: 1.1 },
      {
        yPercent: amount,
        scale: 1.1,
        ease: "none",
        scrollTrigger: {
          trigger: frame,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );
  });
}
