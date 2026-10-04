"use client";
import { LazyMotion } from "motion/react";
import type { ReactNode } from "react";

// Animation features (~25 KB) load after hydration instead of shipping in every page's first bundle.
// Storefront chrome uses the light `m` components; full `motion` components (designer, studio) keep working.
const features = () => import("./motion-features").then((mod) => mod.domAnimation);

export function MotionProvider({ children }: { children: ReactNode }) {
  return <LazyMotion features={features}>{children}</LazyMotion>;
}
