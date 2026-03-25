/**
 * Shared width/height presets for `ModalShell` and `ModalDetailSkeleton`.
 * Kept in a non-client module so server `loading.tsx` files can import safely.
 */

export const MODAL_SHELL_SIZE_MAP = {
  sm:   { width: "min(92vw, 540px)",  height: "min(85vh, 480px)"  },
  md:   { width: "min(92vw, 760px)",  height: "min(85vh, 600px)"  },
  lg:   { width: "min(92vw, 1100px)", height: "min(88vh, 820px)"  },
  xl:   { width: "min(92vw, 1650px)", height: "min(90vh, 1080px)" },
  full: { width: "96vw",              height: "96vh"               },
} as const;

export type ModalSize = keyof typeof MODAL_SHELL_SIZE_MAP;
