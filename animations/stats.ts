import { EASE, qs } from "./core.js";

export function initStats(): void {
  const ticker = document.querySelector(".ticker");
  if (ticker) {
    const ticks = ticker.querySelectorAll(".tick");
    const pulse = ticker.querySelector(".pulse");

    if (pulse) {
      gsap.from(pulse, {
        scaleY: 0,
        transformOrigin: "center top",
        duration: 0.55,
        ease: EASE,
        scrollTrigger: {
          trigger: ticker,
          start: "top 90%",
          toggleActions: "play none none none",
          once: true,
        },
      });
    }

    gsap.from(ticks, {
      y: 28,
      autoAlpha: 0,
      duration: 0.65,
      ease: EASE,
      stagger: 0.1,
      scrollTrigger: {
        trigger: ticker,
        start: "top 88%",
        toggleActions: "play none none none",
        once: true,
      },
    });
  }

  qs<HTMLElement>(".rec").forEach((el) => {
    const raw = (el.textContent || "").trim();
    const match = raw.match(/^(\d+)(.*)$/);
    if (!match) return;
    const end = parseInt(match[1], 10);
    const suffix = match[2] || "";
    if (!end || end > 9999) return;

    const original = raw;
    const state = { n: 0 };

    gsap.to(state, {
      n: end,
      duration: 1.5,
      ease: "power2.out",
      snap: { n: 1 },
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        toggleActions: "play none none none",
        once: true,
      },
      onStart: () => {
        el.textContent = "0" + suffix;
      },
      onUpdate: () => {
        el.textContent = String(Math.round(state.n)) + suffix;
      },
      onComplete: () => {
        el.textContent = original;
      },
    });
  });
}
