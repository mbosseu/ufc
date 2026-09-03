declare const gsap: {
  registerPlugin: (...plugins: unknown[]) => void;
  context: (fn: () => void, scope?: Element | string | object) => { revert: () => void };
  matchMedia: () => {
    add: (query: string, fn: () => void | (() => void)) => unknown;
    revert: () => void;
  };
  timeline: (vars?: Record<string, unknown>) => GSAPTimeline;
  from: (targets: unknown, vars: Record<string, unknown>) => unknown;
  to: (targets: unknown, vars: Record<string, unknown>) => unknown;
  fromTo: (targets: unknown, fromVars: Record<string, unknown>, toVars: Record<string, unknown>) => unknown;
  set: (targets: unknown, vars: Record<string, unknown>) => unknown;
  utils: { toArray: <T = Element>(t: unknown) => T[] };
};

declare const ScrollTrigger: {
  refresh: (safe?: boolean) => void;
  create: (vars: Record<string, unknown>) => unknown;
  getAll: () => { kill: () => void }[];
};

interface GSAPTimeline {
  from: (targets: unknown, vars: Record<string, unknown>, position?: unknown) => GSAPTimeline;
  to: (targets: unknown, vars: Record<string, unknown>, position?: unknown) => GSAPTimeline;
  fromTo: (targets: unknown, fromVars: Record<string, unknown>, toVars: Record<string, unknown>, position?: unknown) => GSAPTimeline;
  set: (targets: unknown, vars: Record<string, unknown>, position?: unknown) => GSAPTimeline;
  add: (child: unknown, position?: unknown) => GSAPTimeline;
}
