const EASE = "power3.out";
const EASE_EXPO = "expo.out";
const EASE_SOFT = "power2.out";
function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function isMobile() {
  return window.matchMedia("(max-width: 980px)").matches;
}
function qs(sel, root = document) {
  return Array.from(root.querySelectorAll(sel));
}
function markMotionReady() {
  document.documentElement.classList.add("motion-ready");
}
function revealOnce(targets, vars, trigger, start = "top 82%") {
  return gsap.from(targets, {
    ...vars,
    scrollTrigger: {
      trigger,
      start,
      toggleActions: "play none none none",
      once: true
    }
  });
}
function clearTransform(targets) {
  gsap.set(targets, { clearProps: "transform" });
}
export {
  EASE,
  EASE_EXPO,
  EASE_SOFT,
  clearTransform,
  isMobile,
  markMotionReady,
  prefersReducedMotion,
  qs,
  revealOnce
};
