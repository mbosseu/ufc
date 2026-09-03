export const EASE = "power3.out";
export const EASE_EXPO = "expo.out";
export const EASE_SOFT = "power2.out";

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isMobile(): boolean {
  return window.matchMedia("(max-width: 980px)").matches;
}

export function qs<T extends Element>(sel: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll(sel));
}

export function markMotionReady(): void {
  document.documentElement.classList.add("motion-ready");
}

export function revealOnce(
  targets: unknown,
  vars: Record<string, unknown>,
  trigger: Element | string,
  start = "top 82%"
): unknown {
  return gsap.from(targets, {
    ...vars,
    scrollTrigger: {
      trigger,
      start,
      toggleActions: "play none none none",
      once: true,
    },
  });
}

export function clearTransform(targets: unknown): void {
  gsap.set(targets, { clearProps: "transform" });
}
