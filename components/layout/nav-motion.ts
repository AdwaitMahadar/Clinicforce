import type { Transition } from "framer-motion";

/** Shared spring for top/side nav sliding `layoutId` pills — snappy but fluid */
export const navPillSpring: Transition = {
  type: "spring",
  stiffness: 880,
  damping: 46,
  mass: 0.32,
};

/** Top nav label fade — kept tight to the pill motion */
export const topNavLabelOpacity: Transition = {
  duration: 0.08,
  delay: 0,
};

/** Collapsed sidebar logo ↔ expand control swap */
export const sidebarLogoSwapSpring: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 34,
  mass: 0.22,
};
