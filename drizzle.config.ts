import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./apps/server/src/sites/db/schema.ts",
  out: "./drizzle",
});
