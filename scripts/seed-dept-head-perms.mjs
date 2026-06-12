import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, "../.env") });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || process.env.DIRECT_URL,
  ssl: (process.env.DATABASE_URL || process.env.DIRECT_URL)?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

const DEPT_HEAD_PERMISSIONS = [
  "dashboard.view",
  "clients.view",
  "clients.create",
  "inquiries.view",
  "calendar.view",
  "equipment.view",
  "equipment.edit",
  "kits.view",
  "staff.view",
  "staff.create",
  "staff.edit",
  "staff.payments",
  "kits.edit",
];

async function main() {
  const deleted = await db.rolePermission.deleteMany({ where: { role: "Department Head" } });
  console.log(`Deleted ${deleted.count} old rows`);

  await db.rolePermission.createMany({
    data: DEPT_HEAD_PERMISSIONS.map((permission) => ({
      role: "Department Head",
      permission,
    })),
  });

  console.log(`Inserted ${DEPT_HEAD_PERMISSIONS.length} permissions for Department Head:`);
  DEPT_HEAD_PERMISSIONS.forEach((p) => console.log(" +", p));
}

main()
  .then(() => db.$disconnect())
  .then(() => pool.end())
  .catch((e) => { console.error(e); process.exit(1); });
