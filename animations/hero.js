import { EASE, EASE_EXPO, isMobile } from "./core.js";
function initHero() {
  const hero = document.querySelector(".hero");
  if (!hero) {
    initPageHero();
    return;
  }
  const photos = hero.querySelectorAll(".hero-photo");
  const kickers = hero.querySelectorAll(".corner .kicker");
  const names = hero.querySelectorAll(".corner .name");
  const divs = hero.querySelectorAll(".corner .div");
  const vs = hero.querySelector(".vs");
  const ctas = hero.querySelectorAll(".hero-cta a");
  const edito = hero.querySelectorAll(".hero-date, .hero-line");
  const slash = hero.querySelector(".hero-slash");
  const cage = hero.querySelector(".cage svg");
  gsap.set(photos, {
    scale: 1.08,
    autoAlpha: 0,
    clipPath: "inset(10% 6% 10% 6%)",
    transformOrigin: "center center"
  });
  gsap.set(kickers, { y: 28, autoAlpha: 0 });
  gsap.set(names, { y: 72, autoAlpha: 0 });
  gsap.set(divs, { y: 22, autoAlpha: 0 });
  gsap.set(ctas, { y: 28, scale: 0.94, autoAlpha: 0 });
  if (edito.length) gsap.set(edito, { y: 20, autoAlpha: 0 });
  if (vs) gsap.set(vs, { autoAlpha: 0, y: 16 });
  const tl = gsap.timeline({ defaults: { ease: EASE_EXPO } });
  tl.to(
    photos,
    {
      autoAlpha: 1,
      scale: 1,
      clipPath: "inset(0% 0% 0% 0%)",
      duration: 1.45,
      stagger: 0.14
    },
    0.08
  );
  if (slash) {
    tl.from(
      slash,
      { scaleY: 0, autoAlpha: 0, duration: 0.7, transformOrigin: "center center" },
      0.28
    );
  }
  if (cage) {
    tl.from(cage, { scale: 0.82, autoAlpha: 0, duration: 1.1, ease: EASE }, 0.18);
  }
  tl.to(kickers, { autoAlpha: 1, y: 0, duration: 0.55, stagger: 0.08 }, 0.42);
  tl.to(names, { autoAlpha: 1, y: 0, duration: 0.85, stagger: 0.1 }, 0.52);
  tl.to(divs, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.08 }, 0.72);
  if (vs) {
    tl.to(vs, { autoAlpha: 1, y: 0, duration: 0.65 }, 0.78);
  }
  if (edito.length) {
    tl.to(edito, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08, ease: EASE }, 0.9);
  }
  if (ctas.length) {
    tl.to(ctas, { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.1, ease: EASE }, 1.08);
  }
  const yPhoto = isMobile() ? 8 : 16;
  const yCopy = isMobile() ? 36 : 72;
  const scrollTl = gsap.timeline({
    scrollTrigger: {
      trigger: hero,
      start: "top top",
      end: "bottom top",
      scrub: true
    }
  });
  scrollTl.to(photos, { yPercent: yPhoto, ease: "none" }, 0);
  scrollTl.to(hero.querySelectorAll(".corner"), { y: yCopy, ease: "none" }, 0);
  if (vs && !isMobile()) scrollTl.to(vs, { autoAlpha: 0, ease: "none" }, 0);
  if (ctas.length) scrollTl.to(ctas, { autoAlpha: 0, ease: "none" }, 0);
  if (slash) scrollTl.to(slash, { autoAlpha: 0, ease: "none" }, 0.15);
  scrollTl.to(hero, { autoAlpha: 0.55, ease: "none" }, 0.45);
  initPageHero();
}
function initPageHero() {
  const pageHero = document.querySelector(".page-hero");
  if (!pageHero) return;
  const kicker = pageHero.querySelector(".kicker");
  const title = pageHero.querySelector("h1");
  const text = pageHero.querySelector("p");
  const updated = pageHero.querySelector(".updated");
  const tl = gsap.timeline({ defaults: { ease: EASE_EXPO } });
  if (pageHero.classList.contains("has-photo")) {
    tl.fromTo(
      pageHero,
      { clipPath: "inset(0 8% 0 8%)" },
      { clipPath: "inset(0 0% 0 0%)", duration: 1.15, ease: EASE_EXPO, onComplete: () => gsap.set(pageHero, { clearProps: "clipPath" }) },
      0
    );
  }
  if (kicker) tl.from(kicker, { y: 28, autoAlpha: 0, duration: 0.55 }, 0.12);
  if (title) tl.from(title, { y: 56, autoAlpha: 0, duration: 0.9 }, 0.2);
  if (text) tl.from(text, { y: 32, autoAlpha: 0, duration: 0.7 }, 0.38);
  if (updated) tl.from(updated, { y: 16, autoAlpha: 0, duration: 0.45 }, 0.52);
}
export {
  initHero
};
