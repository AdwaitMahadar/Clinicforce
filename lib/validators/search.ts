/**
 * Global search input — used by `searchGlobal` server action.
 */

import { z } from "zod";

export const searchGlobalQuerySchema = z
  .string()
  .trim()
  .min(2, "Enter at least 2 characters to search.");
