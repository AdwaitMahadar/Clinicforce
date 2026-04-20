/**
 * Shared prescription enums (no Zod) — single source for DB `meal_timing` pgEnum,
 * Zod `z.enum()`, and TypeScript types.
 */

export const MEAL_TIMINGS = ["before_food", "after_food"] as const;

export type MealTiming = (typeof MEAL_TIMINGS)[number];
