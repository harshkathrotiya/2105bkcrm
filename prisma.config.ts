import path from "node:path";
import { defineConfig } from "prisma/config";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, ".env") });

export default defineConfig({
  schema: path.resolve(__dirname, "prisma/schema.prisma"),
  datasource: {
    url: process.env.MIGRATION_DATABASE_URL || process.env.DIRECT_URL!,
  },
});
