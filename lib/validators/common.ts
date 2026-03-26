/**
 * lib/validators/common.ts
 *
 * Shared validation primitives reused across all entity action files.
 * Import from here instead of redefining locally.
 */

import { z } from "zod";

/** UUID validator for entity IDs passed to get/update/delete actions. */
export const idSchema = z.string().uuid("Invalid ID");

/** Coerces empty/blank strings to null for optional nullable DB columns. */
export const n = (v?: string | null): string | null =>
  v && v.trim() ? v.trim() : null;
