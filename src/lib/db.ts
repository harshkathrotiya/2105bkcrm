import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "node:path";
import { config as loadEnv } from "dotenv";

// Load .env explicitly for local development
loadEnv({ path: path.resolve(process.cwd(), ".env") });

const globalForPrisma = globalThis as unknown as {
  prismaPool: pg.Pool | undefined;
  prisma: PrismaClient | undefined;
};

const pool =
  globalForPrisma.prismaPool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL!,
    // 1 connection per serverless instance on Vercel (the platform pooler fans
    // out); locally use a larger pool so multi-query routes / HMR don't starve
    // it and trigger Prisma P2028 "unable to start a transaction in time".
    max: !!process.env.VERCEL ? 1 : 10,
    ssl: (process.env.DATABASE_URL || process.env.DIRECT_URL)?.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });

const adapter = new PrismaPg(pool);

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter } as any);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaPool = pool;
  globalForPrisma.prisma = db;
}
