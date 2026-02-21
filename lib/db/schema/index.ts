/**
 * Central schema export — import from here everywhere.
 * Order matters: clinics first (no deps), then auth (refs clinics),
 * then business tables that ref both.
 */
export * from "./clinics";
export * from "./auth";
export * from "./patients";
export * from "./appointments";
export * from "./documents";
export * from "./medicines";
