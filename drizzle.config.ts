import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit is a standalone CLI — it doesn't load Next.js .env.local automatically
config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/db/schema/index.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
