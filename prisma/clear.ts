import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, "../.env") });

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_URL!,
  ssl: process.env.DIRECT_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log("🧹 Clearing all database tables...");

  // Delete in dependency order to prevent foreign key constraint violations
  console.log("  → Clearing EquipmentBooking...");
  await prisma.equipmentBooking.deleteMany();

  console.log("  → Clearing StaffPayment...");
  await prisma.staffPayment.deleteMany();

  console.log("  → Clearing StaffAssignment...");
  await prisma.staffAssignment.deleteMany();

  console.log("  → Clearing Invoice...");
  await prisma.invoice.deleteMany();

  console.log("  → Clearing Quotation...");
  await prisma.quotation.deleteMany();

  console.log("  → Clearing Inquiry...");
  await prisma.inquiry.deleteMany();

  console.log("  → Clearing Client...");
  await prisma.client.deleteMany();

  console.log("  → Clearing CalendarEvent...");
  await prisma.calendarEvent.deleteMany();

  console.log("  → Clearing Equipment...");
  await prisma.equipment.deleteMany();

  console.log("  → Clearing Kit...");
  await prisma.kit.deleteMany();

  console.log("  → Clearing Vendor...");
  await prisma.vendor.deleteMany();

  console.log("  → Clearing Staff...");
  await prisma.staff.deleteMany();

  console.log("  → Clearing User...");
  await prisma.user.deleteMany();

  console.log("✨ All tables cleared successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Clear failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
