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

const isVercel = !!process.env.VERCEL;

const pool =
  globalForPrisma.prismaPool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL!,
    // Vercel: 1 connection per serverless instance (platform pooler fans out).
    // Local: 5 — enough headroom without overwhelming Neon's idle-connection
    // reaper (which sends P1017 "connection terminated" when it closes a socket
    // the pool thinks is still open).
    max: isVercel ? 1 : 5,
    // Release idle connections after 10 s so Neon doesn't close them first.
    idleTimeoutMillis: 10_000,
    // Give up acquiring a connection after 5 s rather than hanging forever.
    connectionTimeoutMillis: 5_000,
    ssl: (process.env.DATABASE_URL || process.env.DIRECT_URL)?.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });

// Re-emit pool errors so Node doesn't crash on unhandled 'error' events from
// connections that are closed by the server while idle in the pool.
pool.on("error", (err) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[db pool] idle client error (connection recycled):", err.message);
  }
});

const adapter = new PrismaPg(pool);

export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter } as any);

// Retry a DB call once on transient connection errors (P1017 / ConnectionClosed /
// "Connection terminated unexpectedly"). Neon closes idle connections after ~5 min;
// the pool hands out a dead socket, the first attempt fails, the pool removes it,
// and the retry gets a fresh connection.
const RETRYABLE = /P1017|connection.*terminated|connection.*closed|ConnectionClosed/i;
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    const code = err?.code ?? err?.cause?.code ?? "";
    if (RETRYABLE.test(msg) || RETRYABLE.test(code)) {
      // Brief pause so the pool can open a fresh connection.
      await new Promise((r) => setTimeout(r, 150));
      return fn();
    }
    throw err;
  }
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaPool = pool;
  globalForPrisma.prisma = db;
}
