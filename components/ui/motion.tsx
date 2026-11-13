"use client";

import { MotionConfig, motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";

/** Turns every animation off when the phone/computer asks for "reduce motion". */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/** Page enter: fade + small slide up (200 ms). */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** A list whose items appear one after another (small stagger). Use with <StaggerItem>. */
export function Stagger({ children, className, as = "div" }: { children: ReactNode; className?: string; as?: "div" | "ul" }) {
  const Comp = as === "ul" ? motion.ul : motion.div;
  return (
    <Comp className={className} initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
      {children}
    </Comp>
  );
}

export function StaggerItem({ children, className, as = "div", ...rest }: HTMLMotionProps<"div"> & { as?: "div" | "li" }) {
  const Comp = as === "li" ? motion.li : motion.div;
  return (
    <Comp
      className={className}
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE } } }}
      {...(rest as object)}
    >
      {children}
    </Comp>
  );
}
