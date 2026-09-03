import { markMotionReady, prefersReducedMotion } from "./core.js";
import { initHeader } from "./header.js";
import { initHero } from "./hero.js";
import { initIntro } from "./intro.js";
import { initServices } from "./services.js";
import { initGallery } from "./gallery.js";
import { initStats } from "./stats.js";
import { initStorytelling } from "./storytelling.js";
import { initTestimonials } from "./testimonials.js";
import { initCta } from "./cta.js";
import { initFooter } from "./footer.js";

function boot(): void {
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add("js-motion");

  if (prefersReducedMotion()) {
    markMotionReady();
    document.documentElement.classList.add("motion-reduce");
    return;
  }

  const steps: Array<[string, () => void]> = [
    ["header", initHeader],
    ["hero", initHero],
    ["intro", initIntro],
    ["services", initServices],
    ["gallery", initGallery],
    ["stats", initStats],
    ["storytelling", initStorytelling],
    ["testimonials", initTestimonials],
    ["cta", initCta],
    ["footer", initFooter],
  ];

  for (const [name, fn] of steps) {
    try {
      fn();
    } catch (err) {
      console.error("[motion]", name, err);
    }
  }

  markMotionReady();
  requestAnimationFrame(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

window.setTimeout(() => {
  document.documentElement.classList.add("motion-ready");
}, 4000);
