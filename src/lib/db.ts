import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "node:path";
import { config as loadEnv } from "dotenv";

// Load .env explicitly for local development
loadEnv({ path: path.resolve(process.cwd(), ".env") });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const globalForPrisma = globalThis as unknown as {
  prismaPool: pg.Pool | undefined;
  prisma: PrismaClient | undefined;
};

const pool =
  globalForPrisma.prismaPool ??
  new pg.Pool({
    connectionString: process.env.DIRECT_URL!,
    max: 2,
    ssl: process.env.DIRECT_URL?.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });

const adapter = new PrismaPg(pool);

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter } as any);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaPool = pool;
  globalForPrisma.prisma = db;
}
