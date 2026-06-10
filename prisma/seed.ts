/**
 * prisma/seed.ts — Real data seed for BK CRM
 * Run: npx tsx prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, "../.env") });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_URL!,
  ssl: process.env.DIRECT_URL?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const NOW = new Date().toISOString();

// ── helpers ──────────────────────────────────────────────────────────────────
function parseQty(raw: string | number): { quantity: number; quantity_unit: string } {
  const s = String(raw || "1").trim();
  if (/pair/i.test(s)) return { quantity: parseInt(s) || 1, quantity_unit: "pair" };
  if (/mtr|metre|meter/i.test(s)) return { quantity: parseInt(s) || 1, quantity_unit: "metre" };
  const n = parseInt(s);
  return { quantity: isNaN(n) || n < 1 ? 1 : n, quantity_unit: "pieces" };
}

// bill_number="Sold" was used in the spreadsheet to mark sold items
function isSold(billNumber?: string): boolean {
  return String(billNumber || "").toLowerCase() === "sold";
}

function parseDate(d?: string): string | null {
  if (!d) return null;
  // Handle dd/mm/yyyy
  const parts = d.trim().split("/");
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`;
  }
  return d || null;
}

async function main() {
  console.log("🌱 Seeding BK CRM — real data...\n");

  // ── CLEAR (reverse dependency order) ────────────────────────────────────────
  console.log("  → clearing existing data");
  await prisma.clientEquipmentRate.deleteMany();
  await prisma.ledDispatchBox.deleteMany();
  await prisma.equipmentBooking.deleteMany();
  await prisma.staffPayment.deleteMany();
  await prisma.staffAssignment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.client.deleteMany();
  await prisma.equipment.deleteMany();
  await prisma.kit.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.optionList.deleteMany();
  await prisma.user.deleteMany();
  console.log("     ✓ cleared\n");

  // ── 1. USERS ─────────────────────────────────────────────────────────────────
  console.log("  → users");
  const adminHash = await bcrypt.hash("admin", 12);
  await prisma.user.create({
    data: { username: "admin", name: "Admin", password: adminHash, role: "Admin", is_active: 1, created_at: NOW },
  });
  console.log("     ✓ 1 user (admin/admin)\n");

  // ── 2. ROLE PERMISSIONS ───────────────────────────────────────────────────────
  console.log("  → role permissions");
  const ALL_PERMS = [
    "dashboard.view",
    "clients.view","clients.create","clients.edit","clients.delete",
    "inquiries.view","inquiries.create","inquiries.edit",
    "quotations.view","quotations.create","quotations.edit",
    "invoices.view","invoices.edit",
    "calendar.view",
    "equipment.view","equipment.create","equipment.edit","equipment.delete",
    "kits.view","kits.edit",
    "vendors.view","vendors.edit",
    "staff.view","staff.create","staff.edit","staff.payments",
    "warehouse.view",
    "reports.view",
    "settings.users",
  ];
  const MANAGER_PERMS = ALL_PERMS.filter(p => p !== "settings.users");
  const OPERATOR_PERMS = ALL_PERMS.filter(p => p.endsWith(".view"));

  const rpData: any[] = [];
  for (const p of ALL_PERMS)     rpData.push({ role: "Admin",    permission: p });
  for (const p of MANAGER_PERMS) rpData.push({ role: "Manager",  permission: p });
  for (const p of OPERATOR_PERMS)rpData.push({ role: "Operator", permission: p });
  await prisma.rolePermission.createMany({ data: rpData });
  console.log(`     ✓ ${rpData.length} role-permission rows\n`);

  // ── 3. OPTION LISTS ───────────────────────────────────────────────────────────
  console.log("  → option lists");
  const staffRoles = ["Videographer","Photographer","Mixer Operator","Editor","FPV Operator","Drone Operator","Crane Operator","LED Operator","Audio Operator","Photo Editor","Graphics Designer","Other"];
  const quotPositions = [
    { value:"Center Tally",       meta_equip:"",              meta_rate:0 },
    { value:"Center Full Wide",   meta_equip:"",              meta_rate:0 },
    { value:"Center Semi Wide",   meta_equip:"",              meta_rate:0 },
    { value:"Wireless 1",         meta_equip:"",              meta_rate:0 },
    { value:"Wireless 2",         meta_equip:"",              meta_rate:0 },
    { value:"Wireless 3",         meta_equip:"",              meta_rate:0 },
    { value:"Wireless 4",         meta_equip:"",              meta_rate:0 },
    { value:"Photo 1",            meta_equip:"",              meta_rate:0 },
    { value:"Photo 2",            meta_equip:"",              meta_rate:0 },
    { value:"Photo 3",            meta_equip:"",              meta_rate:0 },
    { value:"Photo 4",            meta_equip:"",              meta_rate:0 },
    { value:"Drone",              meta_equip:"",              meta_rate:0 },
    { value:"Video Crane 32ft",   meta_equip:"Crane 32 Feet", meta_rate:0 },
    { value:"Editor",             meta_equip:"",              meta_rate:0 },
    { value:"FPV",                meta_equip:"",              meta_rate:0 },
    { value:"LED Operator",       meta_equip:"",              meta_rate:0 },
    { value:"Audio Operator",     meta_equip:"",              meta_rate:0 },
    { value:"Graphics Designer",  meta_equip:"",              meta_rate:0 },
  ];
  const olData: any[] = [];
  staffRoles.forEach((v,i)  => olData.push({ type:"STAFF_ROLE",        value:v, sort_order:i, is_active:1, created_at:NOW }));
  quotPositions.forEach((p,i)=> olData.push({ type:"QUOTATION_POSITION",value:p.value, meta_equip:p.meta_equip||null, meta_rate:p.meta_rate||null, sort_order:i, is_active:1, created_at:NOW }));
  await prisma.optionList.createMany({ data: olData });
  console.log(`     ✓ ${olData.length} option list entries\n`);

  // ── 4. CLIENTS ────────────────────────────────────────────────────────────────
  console.log("  → clients");
  await prisma.client.createMany({ data: [
    { id:"c-VDL",  initials:"VDL",  name:"Vadtal",          contact:"Gunsagar Swami",   mobile:"9624030632", email:"",  gst:"", pan:"", address_line:"Shree Swaminarayan Mandir, Narsanda - Vadtal Rd, Vadtal, Gujarat 387375", city:"Vadtal",   district:"Kheda",    state:"Gujarat", pin:"387375", status:"Active", created_at:NOW },
    { id:"c-SLG",  initials:"SLG",  name:"Salangpur",       contact:"Nilkanth bhagat",  mobile:"8630520428", email:"",  gst:"", pan:"", address_line:"", city:"",        district:"",         state:"Gujarat", pin:"",       status:"Active", created_at:NOW },
    { id:"c-DHLR", initials:"DHLR", name:"Dholera",         contact:"Yuvrajbhai",       mobile:"9979854490", email:"",  gst:"", pan:"", address_line:"", city:"Dholera", district:"Ahmedabad", state:"Gujarat", pin:"",       status:"Active", created_at:NOW },
    { id:"c-SRD",  initials:"SRD",  name:"Sardhar",         contact:"Sant Swami",       mobile:"9099999648", email:"",  gst:"", pan:"", address_line:"", city:"",        district:"",         state:"Gujarat", pin:"",       status:"Active", created_at:NOW },
    { id:"c-GDD",  initials:"GDD",  name:"Gadhda",          contact:"Harijivan Swami",  mobile:"",           email:"",  gst:"", pan:"", address_line:"", city:"",        district:"",         state:"Gujarat", pin:"",       status:"Active", created_at:NOW },
    { id:"c-SMV",  initials:"SMV",  name:"Samved",          contact:"Kapilbhai",        mobile:"9925173767", email:"",  gst:"", pan:"", address_line:"", city:"",        district:"",         state:"Gujarat", pin:"",       status:"Active", created_at:NOW },
    { id:"c-KLP",  initials:"KLP",  name:"Kalupur",         contact:"",                 mobile:"",           email:"",  gst:"", pan:"", address_line:"", city:"",        district:"",         state:"Gujarat", pin:"",       status:"Active", created_at:NOW },
    { id:"c-JTP",  initials:"JTP",  name:"Jetalpur",        contact:"Janmangal Swami",  mobile:"",           email:"",  gst:"", pan:"", address_line:"", city:"",        district:"",         state:"Gujarat", pin:"",       status:"Active", created_at:NOW },
    { id:"c-SJV",  initials:"SJV",  name:"Shreeji Visuals", contact:"Dilipbhai",        mobile:"8758402560", email:"",  gst:"", pan:"", address_line:"", city:"",        district:"",         state:"Gujarat", pin:"",       status:"Active", created_at:NOW },
    { id:"c-GB",   initials:"GB",   name:"Giribapu",        contact:"Priteshbhai",      mobile:"8238249999", email:"",  gst:"", pan:"", address_line:"", city:"",        district:"",         state:"Gujarat", pin:"",       status:"Active", created_at:NOW },
    { id:"c-LYD",  initials:"LYD",  name:"Loyadham",        contact:"Sneh Swami",       mobile:"9724041003", email:"",  gst:"", pan:"", address_line:"", city:"",        district:"",         state:"Gujarat", pin:"",       status:"Active", created_at:NOW },
    { id:"c-HNG",  initials:"HNG",  name:"Harinagar - Pij", contact:"PD Swami",         mobile:"9824610582", email:"",  gst:"", pan:"", address_line:"", city:"",        district:"",         state:"Gujarat", pin:"",       status:"Active", created_at:NOW },
    { id:"c-VRSD", initials:"VRSD", name:"Virsad",          contact:"Gyan Swami",       mobile:"",           email:"",  gst:"", pan:"", address_line:"", city:"",        district:"",         state:"Gujarat", pin:"",       status:"Active", created_at:NOW },
    { id:"c-BKK",  initials:"BKK",  name:"BK Media",        contact:"Kaushikbhai",      mobile:"7046483595", email:"",  gst:"", pan:"", address_line:"", city:"Vadodara",district:"Vadodara",  state:"Gujarat", pin:"",       status:"Active", created_at:NOW },
    { id:"c-BKM",  initials:"BKM",  name:"BK Media",        contact:"Manishbhai",       mobile:"9904844580", email:"",  gst:"", pan:"", address_line:"", city:"Vadodara",district:"Vadodara",  state:"Gujarat", pin:"",       status:"Active", created_at:NOW },
    { id:"c-BKJ",  initials:"BKJ",  name:"BK Media",        contact:"Jayeshbhai",       mobile:"8238432128", email:"",  gst:"", pan:"", address_line:"", city:"Vadodara",district:"Vadodara",  state:"Gujarat", pin:"",       status:"Active", created_at:NOW },
    { id:"c-BKS",  initials:"BKS",  name:"BK Media",        contact:"Smitbhai",         mobile:"9033549001", email:"",  gst:"", pan:"", address_line:"", city:"Vadodara",district:"Vadodara",  state:"Gujarat", pin:"",       status:"Active", created_at:NOW },
  ]});
  console.log("     ✓ 17 clients\n");

  // ── 5. VENDORS ────────────────────────────────────────────────────────────────
  console.log("  → vendors");
  const v1 = await prisma.vendor.create({ data: { name:"Shreeji Film", phone:"9876543210", email:"bhavesh@gmail.com", gst_number:"27AADCB2230M1Z2", city:"Botad", notes:"Contact: Bhaveshbhai", is_active:1, created_at:NOW } });
  const v2 = await prisma.vendor.create({ data: { name:"Devsibhai",    phone:"",           email:null,               gst_number:null,               city:"",      notes:"",                    is_active:1, created_at:NOW } });
  const v3 = await prisma.vendor.create({ data: { name:"Dilipbhai",    phone:"",           email:null,               gst_number:null,               city:"",      notes:"Also client: Shreeji Visuals (SJV)", is_active:1, created_at:NOW } });
  console.log(`     ✓ 3 vendors (ids: ${v1.id}, ${v2.id}, ${v3.id})\n`);

  // ── 6. KITS (from body_name groups in equipment CSV) ──────────────────────────
  console.log("  → kits");
  // Each unique body_name that has multiple items under it becomes a kit
  const kitDefs = [
    "Sony FX6",
    "Sony FX3",
    "Sony FX7",
    "SONY Z150-01","SONY Z150-02","SONY Z150-03","SONY Z150-05",
    "SONY Alpha 7S III",
    "Sony Alpha 7 IV",
    "Sony ILCE 7M5",
    "Sony PXW X70",
    "Dji Ronin RS 4 Pro",
    "Blackmagic ATEM Switcher 8 Channel HD",
    "Blackmagic ATEM Switcher 8 Channel 4K 01",
    "Blackmagic ATEM 2 M/E Constellation 4K - 20 Ch.",
    "Blackmagic ATEM 2 M/E Constellation HD - 20 Ch.",
    "Blackmagic ATEM 1 M/E Advanced Pannel - 20",
    "Blackmagic ATEM 1 M/E Advanced Pannel - 10Ch.",
    "Blackmagic ATEM 1 M/E Constellation 4K - 10 Ch.",
    "Blackmagic ATEM MIni 4 Channel HDMI",
    "Blackmagic ATEM Switcher 8 Channel 4K-02",
    "Blackmagic Hyperdcek Recorder 4K Pro- 01",
    "Blackmagic Hyperdcek Recorder 4K Pro- 02",
    "Blackmagic Hyperdcek Recorder 4K Pro- 03 & 04",
    "Blackmagic Hyperdcek Recorder HD Pro",
    "Black Magic Hyperdcek Recorder 4K Pro",
    "Blackmagic Recorder HD",
    "Blackmagic Video Assist",
    "Blackmagic Smart Scop Duo",
    "Blackmagic Smart View 4K",
    "Blackmagic Videohub 20x20 12G",
    "IP Converter SFP",
    "Bidirectional 12G wPSU",
    "Bidirectional 12G",
    "Mini Converter SDI Distribution",
    "Blackmagic SDI to HDMI 12G Micro Converter",
    "Blackmagic HDMI to SDI 12G Micro Converter",
    "Blackmagic HDMI to SDI 3G Micro Converter",
    "BiDirectional SDI/HDMI 12G",
    "BiDirectional SDI/HDMI 3G",
    "Blackmagic Optical Fiber 12G SDI - 15 Pair",
    "Blackmagic Optical Fiber 3G SDI - 3 Pair",
    "YAMAHA MG 06 - 01","YAMAHA MG 06 - 02","YAMAHA MG 06 - 03",
    "Hollyland Mars 4K - 01","Hollyland Mars 4K - 02","Hollyland Mars 4K - 03",
    "Accsoon Master 4K",
    "Hollyland Wirelass Tally System 8 Pair",
    "Live-U SOLO HD",
    "Dejero GOBOX HD",
    "Eartec Talkbck 5 Pair",
    "Talkback",
    "HYUNDAI HEADSET WIRELSS INTERCOM- WT13",
    "BAOFENG","BAOFENG Walky Talky",
    "DELL Monitor 27' 4K","HP Monitor 24' HD",
    "Syrotech Media Converter","DBC Media Converter",
    "D-Link Switch",
    "MT-ViKI 8 Port SDI Spiter HD",
    "Nova Link 4K HDMI Fiber Optic Converter",
    "Fly Video SDI HD Video Fiber Optic Converter",
    "Nova link 8 Port HDMI Spliter HD",
    "AV Matrix Spliter & Converter",
    "APC Backup UPS","Online UPS",
    "E-Image Camera Tripod","Wirelass Tripod","Tripod Studio Assist",
    "Jio Air Fiber",
    "Power bank","Source PC","Power Pannel",
    "SDI Snake Cable",
    "Digitek LED",
    "GODOX V860",
    "SONY Alpha 7S III",  // duplicate guard handled below
  ];
  // Deduplicate
  const uniqueKitNames = [...new Set(kitDefs)];

  const kitMap: Record<string,number> = {};
  for (const name of uniqueKitNames) {
    const k = await prisma.kit.create({ data: { name, department:"VIDEO", created_at:NOW } });
    kitMap[name] = k.id;
  }
  console.log(`     ✓ ${uniqueKitNames.length} kits\n`);

  // ── 7. EQUIPMENT ──────────────────────────────────────────────────────────────
  console.log("  → equipment");

  // Each row: [product_name, category, qty_raw, serial, body_name, resp_person, purchase_date, purchase_from, bill_number, purchase_price, notes]
  // bill_number="Sold" → status SOLD
  type ERow = {
    product_name: string; category: string; qty_raw?: string|number;
    serial?: string; body_name?: string; resp_person?: string;
    purchase_date?: string; purchase_from?: string; bill_number?: string;
    purchase_price?: number | null; notes?: string;
  };

  const equipRows: ERow[] = [
    // ── FX6 group ──
    { product_name:"Sony FX6",                    category:"CAMERA",          qty_raw:1, serial:"",           body_name:"Sony FX6",          resp_person:"Keyur",        purchase_date:"15/01/2024", purchase_from:"Sony India",            bill_number:"INV-2024-001", purchase_price:350000 },
    { product_name:"Sony Charger",                category:"ACCESSORY",       qty_raw:1, serial:"180978-11",  body_name:"Sony FX6",          resp_person:"Keyur" },
    { product_name:"Sony BP-U35",                 category:"ACCESSORY",       qty_raw:1, serial:"20240811",   body_name:"Sony FX6",          resp_person:"Keyur",        purchase_from:"Ghanshyam Photo" },
    { product_name:"Welborn",                     category:"ACCESSORY",       qty_raw:1, serial:"41154610",   body_name:"Sony FX6",          resp_person:"Keyur",        purchase_from:"Ghanshyam Photo" },
    { product_name:"Lexar Type A Card",           category:"STORAGE",         qty_raw:1,                      body_name:"Sony FX6",          resp_person:"Keyur",        purchase_from:"Ghanshyam Photo" },
    { product_name:"Digitek Accessory",           category:"ACCESSORY",       qty_raw:1,                      body_name:"Sony FX6",          resp_person:"Keyur",        purchase_from:"Ghanshyam Photo" },
    // ── Lenses (standalone) ──
    { product_name:"Sony 200-600mm G 01",         category:"LENS",            qty_raw:1, serial:"1938001",    body_name:undefined,           resp_person:"Keyur",        purchase_from:"Ghanshyam Photo", purchase_price:150000 },
    { product_name:"Sony 200-600mm G 02",         category:"LENS",            qty_raw:1, serial:"1916007",    body_name:undefined,           resp_person:"Keyur",        purchase_from:"Ghanshyam Photo", purchase_price:150000 },
    { product_name:"Sony 400-800mm G",            category:"LENS",            qty_raw:1, serial:"1814652",    body_name:undefined,           resp_person:"Keyur",                                           purchase_price:270000 },
    // ── FX3 group ──
    { product_name:"Sony FX3",                    category:"CAMERA",          qty_raw:1, serial:"1002576",    body_name:"Sony FX3",          resp_person:"Keyur",                                           purchase_price:340000 },
    { product_name:"Lexar Card 800Mbps 160GB (FX3)",category:"STORAGE",       qty_raw:2,                      body_name:"Sony FX3",          resp_person:"Keyur",        purchase_from:"Ghanshyam Photo", purchase_price:24000 },
    { product_name:"SONY NP-FZ100 (FX3)",         category:"ACCESSORY",       qty_raw:3,                      body_name:"Sony FX3",          resp_person:"Keyur",        purchase_from:"Ghanshyam Photo", purchase_price:18000 },
    { product_name:"SONY Charger (FX3)",          category:"ACCESSORY",       qty_raw:1, serial:"3374091",    body_name:"Sony FX3",          resp_person:"Keyur",                                           purchase_price:13000 },
    { product_name:"Digitek (FX3)",               category:"ACCESSORY",       qty_raw:1,                      body_name:"Sony FX3",          resp_person:"Keyur",        purchase_from:"Ghanshyam Photo", bill_number:"Sold", purchase_price:900 },
    // ── FX7 group (SOLD) ──
    { product_name:"Sony FX7",                    category:"CAMERA",          qty_raw:1, serial:"30504",      body_name:"Sony FX7",          resp_person:"Keyur",        bill_number:"Sold", purchase_price:0 },
    { product_name:"Sony PZ 28-135",              category:"LENS",            qty_raw:1, serial:"5117848",    body_name:"Sony FX7",          resp_person:"Keyur",        bill_number:"Sold", purchase_price:0 },
    { product_name:"SONY BC-U1A",                 category:"ACCESSORY",       qty_raw:1, serial:"19042001992",body_name:"Sony FX7",          resp_person:"Keyur",        bill_number:"Sold", purchase_price:0 },
    { product_name:"Welborn (FX7)",               category:"ACCESSORY",       qty_raw:2, serial:"41154610",   body_name:"Sony FX7",          resp_person:"Keyur" },
    // ── Z150-01 group ──
    { product_name:"SONY Z150-01",                category:"CAMERA",          qty_raw:1, serial:"7003244",    body_name:"SONY Z150-01",      resp_person:"Vishal",                                          purchase_price:285000 },
    { product_name:"Lexar Card 90Mbps 64GB (Z150-01)",category:"STORAGE",     qty_raw:1,                      body_name:"SONY Z150-01",      resp_person:"Vishal" },
    { product_name:"SONY NP-F770 (Z150-01)",      category:"ACCESSORY",       qty_raw:1, serial:"41163929",   body_name:"SONY Z150-01",      resp_person:"Vishal",                                          purchase_price:2000 },
    { product_name:"Welborn (Z150-01)",           category:"ACCESSORY",       qty_raw:1, serial:"41154610",   body_name:"SONY Z150-01",      resp_person:"Vishal",                                          purchase_price:1000 },
    { product_name:"SONY BC-L1 (Z150-01)",        category:"ACCESSORY",       qty_raw:1,                      body_name:"SONY Z150-01",      resp_person:"Vishal" },
    // ── Z150-02 group ──
    { product_name:"SONY Z150-02",                category:"CAMERA",          qty_raw:1, serial:"7003683",    body_name:"SONY Z150-02",      resp_person:"Bhano",                                           purchase_price:285000 },
    { product_name:"Lexar Card 90Mbps 64GB (Z150-02)",category:"STORAGE",     qty_raw:1,                      body_name:"SONY Z150-02",      resp_person:"Bhano" },
    { product_name:"SONY NP-F770 (Z150-02)",      category:"ACCESSORY",       qty_raw:1,                      body_name:"SONY Z150-02",      resp_person:"Bhano" },
    { product_name:"DigiTek NP-F950",             category:"ACCESSORY",       qty_raw:1, serial:"41211966",   body_name:"SONY Z150-02",      resp_person:"Bhano" },
    { product_name:"DigiTek BC-L1",               category:"ACCESSORY",       qty_raw:1,                      body_name:"SONY Z150-02",      resp_person:"Bhano" },
    // ── Z150-03 group ──
    { product_name:"SONY Z150-03",                category:"CAMERA",          qty_raw:1, serial:"7001810",    body_name:"SONY Z150-03",      resp_person:"Mayur",                                           purchase_price:285000 },
    { product_name:"Lexar Card 90Mbps 64GB (Z150-03)",category:"STORAGE",     qty_raw:1,                      body_name:"SONY Z150-03",      resp_person:"Mayur" },
    { product_name:"SONY NP-F770 (Z150-03)",      category:"ACCESSORY",       qty_raw:1, serial:"R-41022780", body_name:"SONY Z150-03",      resp_person:"Mayur" },
    { product_name:"Welborn (Z150-03)",           category:"ACCESSORY",       qty_raw:1, serial:"R-41271284", body_name:"SONY Z150-03",      resp_person:"Mayur" },
    { product_name:"SONY BC-L1 (Z150-03)",        category:"ACCESSORY",       qty_raw:1,                      body_name:"SONY Z150-03",      resp_person:"Mayur" },
    // ── Z150-05 group ──
    { product_name:"SONY Z150-05",                category:"CAMERA",          qty_raw:1, serial:"7004593",    body_name:"SONY Z150-05",      resp_person:"Vishal",                                          purchase_price:285000 },
    { product_name:"Lexar Card 90Mbps 64GB (Z150-05)",category:"STORAGE",     qty_raw:1,                      body_name:"SONY Z150-05",      resp_person:"Vishal" },
    { product_name:"SONY NP-F770 (Z150-05)",      category:"ACCESSORY",       qty_raw:1, serial:"R-41163929", body_name:"SONY Z150-05",      resp_person:"Vishal" },
    { product_name:"Osaka (Z150-05)",             category:"ACCESSORY",       qty_raw:1,                      body_name:"SONY Z150-05",      resp_person:"Vishal" },
    { product_name:"SONY BC-L1 (Z150-05)",        category:"ACCESSORY",       qty_raw:1,                      body_name:"SONY Z150-05",      resp_person:"Vishal" },
    // ── ATEM Switchers ──
    { product_name:"Blackmagic ATEM Switcher 8 Channel HD",      category:"VIDEO_MIXER", qty_raw:1, serial:"6112028",  body_name:"Blackmagic ATEM Switcher 8 Channel HD" },
    { product_name:"Blackmagic ATEM Switcher 8 Channel 4K 01",   category:"VIDEO_MIXER", qty_raw:1, serial:"10690763", body_name:"Blackmagic ATEM Switcher 8 Channel 4K 01" },
    { product_name:"Blackmagic ATEM 2 M/E Constellation 4K 20Ch",category:"VIDEO_MIXER", qty_raw:1, serial:"12856972", body_name:"Blackmagic ATEM 2 M/E Constellation 4K - 20 Ch." },
    { product_name:"Blackmagic ATEM 2 M/E Constellation HD 20Ch",category:"VIDEO_MIXER", qty_raw:1, serial:"12804433", body_name:"Blackmagic ATEM 2 M/E Constellation HD - 20 Ch." },
    { product_name:"Blackmagic ATEM 1 M/E Advanced Panel 20Ch",  category:"VIDEO_MIXER", qty_raw:1, serial:"12722973", body_name:"Blackmagic ATEM 1 M/E Advanced Pannel - 20" },
    { product_name:"Blackmagic ATEM 1 M/E Advanced Panel 10Ch",  category:"VIDEO_MIXER", qty_raw:1, serial:"13642616", body_name:"Blackmagic ATEM 1 M/E Advanced Pannel - 10Ch." },
    { product_name:"Blackmagic ATEM 1 M/E Constellation 4K 10Ch",category:"VIDEO_MIXER", qty_raw:1, serial:"13828574", body_name:"Blackmagic ATEM 1 M/E Constellation 4K - 10 Ch." },
    { product_name:"Blackmagic ATEM Mini 4 Channel HDMI",         category:"VIDEO_MIXER", qty_raw:1, serial:"6316230",  body_name:"Blackmagic ATEM MIni 4 Channel HDMI" },
    { product_name:"Adaptor (ATEM Mini)",                         category:"ACCESSORY",   qty_raw:1,                    body_name:"Blackmagic ATEM MIni 4 Channel HDMI" },
    { product_name:"Blackmagic ATEM Switcher 8 Channel 4K-02",    category:"VIDEO_MIXER", qty_raw:1, serial:"6060590",  body_name:"Blackmagic ATEM Switcher 8 Channel 4K-02" },
    // ── Hyperdeck Recorders ──
    { product_name:"Blackmagic Hyperdeck 4K Pro 01",  category:"VIDEO_RECORDER", qty_raw:1, serial:"13584183", body_name:"Blackmagic Hyperdcek Recorder 4K Pro- 01" },
    { product_name:"Blackmagic Hyperdeck 4K Pro 02",  category:"VIDEO_RECORDER", qty_raw:1, serial:"10981229", body_name:"Blackmagic Hyperdcek Recorder 4K Pro- 02" },
    { product_name:"Blackmagic Hyperdeck 4K Pro 03",  category:"VIDEO_RECORDER", qty_raw:1, serial:"14344364", body_name:"Blackmagic Hyperdcek Recorder 4K Pro- 03 & 04" },
    { product_name:"Blackmagic Hyperdeck 4K Pro 04",  category:"VIDEO_RECORDER", qty_raw:1, serial:"14344289", body_name:"Blackmagic Hyperdcek Recorder 4K Pro- 03 & 04" },
    { product_name:"Blackmagic Hyperdeck HD Pro 01",  category:"VIDEO_RECORDER", qty_raw:1, serial:"14133554", body_name:"Blackmagic Hyperdcek Recorder HD Pro" },
    { product_name:"Blackmagic Hyperdeck HD Pro 02",  category:"VIDEO_RECORDER", qty_raw:1, serial:"14133656", body_name:"Blackmagic Hyperdcek Recorder HD Pro" },
    { product_name:"Blackmagic Recorder HD",          category:"VIDEO_RECORDER", qty_raw:1, serial:"4282141",  body_name:"Blackmagic Recorder HD" },
    { product_name:"Lexar 200Mbps 64GB+128GB (HD)",   category:"STORAGE",        qty_raw:2,                    body_name:"Blackmagic Recorder HD" },
    { product_name:"Samsung 1TB SSD",                 category:"STORAGE",        qty_raw:1, serial:"S74ZNX0X714569B", body_name:"Black Magic Hyperdcek Recorder 4K Pro" },
    // ── Scopes & Monitors (Blackmagic) ──
    { product_name:"Blackmagic Smart Scop Duo",   category:"MONITOR",       qty_raw:1, serial:"13293975", body_name:"Blackmagic Smart Scop Duo" },
    { product_name:"Adaptor (Smart Scop Duo)",    category:"ACCESSORY",     qty_raw:1,                    body_name:"Blackmagic Smart Scop Duo" },
    { product_name:"Blackmagic Smart View 4K",    category:"MONITOR",       qty_raw:1, serial:"13678881", body_name:"Blackmagic Smart View 4K" },
    { product_name:"Blackmagic Video Assist",     category:"VIDEO_RECORDER",qty_raw:1, serial:"8313431",  body_name:"Blackmagic Video Assist" },
    { product_name:"Adaptor (Video Assist)",      category:"ACCESSORY",     qty_raw:1,                    body_name:"Blackmagic Video Assist" },
    { product_name:"ProGrade 250Mbps 128GB",      category:"STORAGE",       qty_raw:3,                    body_name:"Blackmagic Video Assist" },
    // ── Audio Mixers ──
    { product_name:"YAMAHA MG06 01", category:"AUDIO_MIXER", qty_raw:1, serial:"INGEL01103",  body_name:"YAMAHA MG 06 - 01" },
    { product_name:"Adaptor (MG06-01)", category:"ACCESSORY", qty_raw:1, serial:"R-41030007", body_name:"YAMAHA MG 06 - 01" },
    { product_name:"YAMAHA MG06 02", category:"AUDIO_MIXER", qty_raw:1, serial:"INGXY01032",  body_name:"YAMAHA MG 06 - 02" },
    { product_name:"Adaptor (MG06-02)", category:"ACCESSORY", qty_raw:1, serial:"R-4103007",  body_name:"YAMAHA MG 06 - 02" },
    { product_name:"YAMAHA MG06 03", category:"AUDIO_MIXER", qty_raw:1, serial:"INGDX01029",  body_name:"YAMAHA MG 06 - 03" },
    { product_name:"Adaptor (MG06-03)", category:"ACCESSORY", qty_raw:1,                       body_name:"YAMAHA MG 06 - 03" },
    { product_name:"Behringer Audio Splitter", category:"AUDIO_MIXER", qty_raw:1 },
    // ── Wireless TX ──
    { product_name:"Hollyland Mars 4K 01",   category:"WIRELESS_TX", qty_raw:1, serial:"0023050T-R", body_name:"Hollyland Mars 4K - 01" },
    { product_name:"DiGitek (Mars4K-01)",    category:"ACCESSORY",   qty_raw:3,                       body_name:"Hollyland Mars 4K - 01" },
    { product_name:"TYFY (Mars4K-01)",       category:"ACCESSORY",   qty_raw:1,                       body_name:"Hollyland Mars 4K - 01" },
    { product_name:"Hollyland Mars 4K 02",   category:"WIRELESS_TX", qty_raw:1, serial:"0023470T-R", body_name:"Hollyland Mars 4K - 02" },
    { product_name:"Adaptor (Mars4K-02)",    category:"ACCESSORY",   qty_raw:1,                       body_name:"Hollyland Mars 4K - 02" },
    { product_name:"Digitek (Mars4K-02 x3)", category:"ACCESSORY",   qty_raw:3,                       body_name:"Hollyland Mars 4K - 02" },
    { product_name:"Digitek (Mars4K-02 x1)", category:"ACCESSORY",   qty_raw:1,                       body_name:"Hollyland Mars 4K - 02" },
    { product_name:"Hollyland Mars 4K 03",   category:"WIRELESS_TX", qty_raw:1, serial:"0023470T-R", body_name:"Hollyland Mars 4K - 03" },
    { product_name:"Digitek (Mars4K-03)",    category:"ACCESSORY",   qty_raw:1,                       body_name:"Hollyland Mars 4K - 03" },
    { product_name:"Hollyland Adaptor (Mars4K-03)", category:"ACCESSORY", qty_raw:1,                  body_name:"Hollyland Mars 4K - 03" },
    { product_name:"INfitek TY FY Digitek", category:"ACCESSORY",   qty_raw:1,                        body_name:"Hollyland Mars 4K - 03" },
    { product_name:"Accsoon Master 4K",      category:"WIRELESS_TX", qty_raw:1, serial:"WIT07-0905-BD0H WIT07-1103-BD0H", body_name:"Accsoon Master 4K" },
    { product_name:"Welborn (Accsoon x3)",   category:"ACCESSORY",   qty_raw:3,                       body_name:"Accsoon Master 4K" },
    { product_name:"Welborn (Accsoon x1)",   category:"ACCESSORY",   qty_raw:1,                       body_name:"Accsoon Master 4K" },
    { product_name:"Adaptor (Accsoon)",      category:"ACCESSORY",   qty_raw:1,                       body_name:"Accsoon Master 4K" },
    { product_name:"Accsoon Wireless Kit",   category:"WIRELESS_TX", qty_raw:1, notes:"3 batteries, 1 charger, 1 powercord" },
    { product_name:"HDMI Wireless RX TX",    category:"WIRELESS_TX", qty_raw:2 },
    // ── Streaming ──
    { product_name:"Live-U SOLO HD",   category:"STREAMING_DEVICE", qty_raw:1, serial:"202120-23099", body_name:"Live-U SOLO HD" },
    { product_name:"Live-U Accessory", category:"ACCESSORY",         qty_raw:1,                        body_name:"Live-U SOLO HD" },
    { product_name:"Huawei SIM",       category:"ACCESSORY",         qty_raw:2,                        body_name:"Live-U SOLO HD" },
    { product_name:"Live-U Solo 4K",   category:"STREAMING_DEVICE", qty_raw:1, serial:"3S2425-47387" },
    { product_name:"Dejero GOBOX HD",  category:"STREAMING_DEVICE", qty_raw:1, serial:"4290654",      body_name:"Dejero GOBOX HD" },
    { product_name:"Adaptor (Dejero)", category:"ACCESSORY",         qty_raw:1,                        body_name:"Dejero GOBOX HD" },
    { product_name:"Blackmagic Web Presenter 4K", category:"STREAMING_DEVICE", qty_raw:1, serial:"13599218" },
    // ── Tally ──
    { product_name:"Hollyland Wireless Tally 8 Pair",  category:"TALLY_SYSTEM", qty_raw:1,               body_name:"Hollyland Wirelass Tally System 8 Pair" },
    { product_name:"Hollyland Tally HUB",              category:"TALLY_SYSTEM", qty_raw:1, serial:"24R24522BLH", body_name:"Hollyland Wirelass Tally System 8 Pair" },
    { product_name:"Hollyland Battery HUB 8",         category:"ACCESSORY",    qty_raw:1, serial:"24V245222X7", body_name:"Hollyland Wirelass Tally System 8 Pair" },
    { product_name:"Hollyland Adapter (Tally)",        category:"ACCESSORY",    qty_raw:2,                body_name:"Hollyland Wirelass Tally System 8 Pair" },
    // ── Intercom ──
    { product_name:"Eartec Talkback 5 Pair",           category:"INTERCOM", qty_raw:1, body_name:"Eartec Talkbck 5 Pair" },
    { product_name:"Eartec Battery HUB 5 Pair",        category:"INTERCOM", qty_raw:1, body_name:"Eartec Talkbck 5 Pair" },
    { product_name:"EARTEC Talkback 8 Pair Kit",       category:"INTERCOM", qty_raw:1, notes:"13 batteries, 1 HUB, 1 charger", body_name:"Talkback" },
    { product_name:"HYUNDAI Wireless Intercom WT13",   category:"INTERCOM", qty_raw:1, purchase_date:"10/10/2025", purchase_from:"Avis Visiontech Private Limited", purchase_price:211173, body_name:"HYUNDAI HEADSET WIRELSS INTERCOM- WT13", notes:"13 headsets, 13 batteries, 3 chargers, 2 adapters" },
    { product_name:"BAOFENG Walkie Talkie (Set 1)",    category:"INTERCOM", qty_raw:6, body_name:"BAOFENG", purchase_price:6000 },
    { product_name:"BAOFENG Walkie Talkie (Set 2)",    category:"INTERCOM", qty_raw:6, body_name:"BAOFENG Walky Talky" },
    // ── Monitors ──
    { product_name:"DELL Monitor 27 inch 4K (x2)",    category:"MONITOR", qty_raw:2, serial:"CN-0K6CXN-QDC00-47O-0ELB CN-0K6CXN-QDC00-47O-0FCB", body_name:"DELL Monitor 27' 4K" },
    { product_name:"HP Monitor 24 inch HD (x2)",      category:"MONITOR", qty_raw:2, serial:"3CM4151866 3CM4151861", body_name:"HP Monitor 24' HD" },
    { product_name:"HP Adaptor",                      category:"ACCESSORY", qty_raw:2, body_name:"HP Monitor 24' HD" },
    { product_name:"DP to HDMI ERA Cable",            category:"ACCESSORY", qty_raw:2, body_name:"HP Monitor 24' HD" },
    { product_name:"DELL Monitor 27 inch HD (x2)",    category:"MONITOR", qty_raw:2 },
    // ── Converters ──
    { product_name:"Syrotech Media Converter",        category:"CONVERTER", qty_raw:2, serial:"SY171223HD5303FXX2667 SY1801HD3503FXX2873", body_name:"Syrotech Media Converter" },
    { product_name:"Adaptor (Syrotech)",              category:"ACCESSORY", qty_raw:2, body_name:"Syrotech Media Converter" },
    { product_name:"DBC Media Converter",             category:"CONVERTER", qty_raw:1, serial:"FON24040124242", body_name:"DBC Media Converter" },
    { product_name:"Adaptor (DBC)",                   category:"ACCESSORY", qty_raw:1, body_name:"DBC Media Converter" },
    { product_name:"D-Link Switch",                   category:"NETWORK",   qty_raw:1, serial:"U8DW137000498", body_name:"D-Link Switch" },
    { product_name:"Adaptor (D-Link)",                category:"ACCESSORY", qty_raw:1, body_name:"D-Link Switch" },
    { product_name:"MT-ViKI 8 Port SDI Splitter HD",  category:"SPLITTER",  qty_raw:1, serial:"100001123849", body_name:"MT-ViKI 8 Port SDI Spiter HD" },
    { product_name:"Adaptor (MT-ViKI)",               category:"ACCESSORY", qty_raw:1, body_name:"MT-ViKI 8 Port SDI Spiter HD" },
    { product_name:"Nova Link 4K HDMI Fiber Optic Converter", category:"CONVERTER", qty_raw:"1 Pair", serial:"HL1102206007", body_name:"Nova Link 4K HDMI Fiber Optic Converter" },
    { product_name:"Adaptor (Nova Link 4K)",          category:"ACCESSORY", qty_raw:2, body_name:"Nova Link 4K HDMI Fiber Optic Converter" },
    { product_name:"Fly Video SDI HD Fiber Optic Converter",  category:"CONVERTER", qty_raw:"1 Pair", serial:"111904-2069", body_name:"Fly Video SDI HD Video Fiber Optic Converter" },
    { product_name:"Adaptor (Fly Video SDI)",         category:"ACCESSORY", qty_raw:2, body_name:"Fly Video SDI HD Video Fiber Optic Converter" },
    { product_name:"Nova link 8 Port HDMI Splitter",  category:"SPLITTER",  qty_raw:1, serial:"CAAEH05662", body_name:"Nova link 8 Port HDMI Spliter HD" },
    { product_name:"Adaptor (Nova 8 Port)",           category:"ACCESSORY", qty_raw:1, body_name:"Nova link 8 Port HDMI Spliter HD" },
    { product_name:"Black-i 4 Port HDMI Splitter",   category:"SPLITTER",  qty_raw:2 },
    { product_name:"AV Matrix Splitter Converter",    category:"SPLITTER",  qty_raw:2, body_name:"AV Matrix Spliter & Converter" },
    { product_name:"Adaptor (AV Matrix)",             category:"ACCESSORY", qty_raw:2, body_name:"AV Matrix Spliter & Converter" },
    { product_name:"Blackmagic Videohub 20x20 12G",  category:"SPLITTER",  qty_raw:1, purchase_date:"01/11/2025", purchase_from:"ARTIZ DIGITAL SOLUTION", bill_number:"156", purchase_price:247800, body_name:"Blackmagic Videohub 20x20 12G" },
    { product_name:"24 Port 2RU Rack Patti NB-B75",  category:"ACCESSORY", qty_raw:1, purchase_date:"11/11/2025", purchase_from:"ARTIZ DIGITAL SOLUTION", bill_number:"160", purchase_price:11092 },
    { product_name:"24 Port 2RU Rack Patti (2nd)",   category:"ACCESSORY", qty_raw:1, purchase_date:"14/11/2025", purchase_from:"ARTIZ DIGITAL SOLUTION", purchase_price:8071 },
    { product_name:"BlackMagic 2110 IP Converter 8x12G SFP", category:"CONVERTER", qty_raw:1, serial:"13663291", body_name:"IP Converter SFP" },
    // ── Micro Converters ──
    { product_name:"Blackmagic Optical Fiber 12G SDI (x15 Pair)", category:"CABLE",    qty_raw:"30 Pair", body_name:"Blackmagic Optical Fiber 12G SDI - 15 Pair" },
    { product_name:"Adaptor (Fiber 12G x30)",                      category:"ACCESSORY",qty_raw:30, body_name:"Blackmagic Optical Fiber 12G SDI - 15 Pair" },
    { product_name:"Blackmagic Optical Fiber 3G SDI (x3 Pair)",   category:"CABLE",    qty_raw:"6 Pair",  body_name:"Blackmagic Optical Fiber 3G SDI - 3 Pair" },
    { product_name:"Blackmagic SDI to HDMI 12G Micro Converter",  category:"CONVERTER",qty_raw:3,  body_name:"Blackmagic SDI to HDMI 12G Micro Converter" },
    { product_name:"Adaptor (SDI>HDMI 12G x3)",                   category:"ACCESSORY",qty_raw:3,  body_name:"Blackmagic SDI to HDMI 12G Micro Converter" },
    { product_name:"Blackmagic HDMI to SDI 12G Micro Converter",  category:"CONVERTER",qty_raw:5,  body_name:"Blackmagic HDMI to SDI 12G Micro Converter" },
    { product_name:"Adaptor (HDMI>SDI 12G x5)",                   category:"ACCESSORY",qty_raw:5,  body_name:"Blackmagic HDMI to SDI 12G Micro Converter" },
    { product_name:"Blackmagic HDMI to SDI 3G Micro Converter",   category:"CONVERTER",qty_raw:4,  body_name:"Blackmagic HDMI to SDI 3G Micro Converter" },
    { product_name:"Adaptor (HDMI>SDI 3G x4)",                    category:"ACCESSORY",qty_raw:4,  body_name:"Blackmagic HDMI to SDI 3G Micro Converter" },
    { product_name:"Blackmagic SDI to HDMI 3G Micro Converter",   category:"CONVERTER",qty_raw:2 },
    { product_name:"Blackmagic BiDirectional SDI/HDMI 12G (x3)",  category:"CONVERTER",qty_raw:3,  body_name:"BiDirectional SDI/HDMI 12G" },
    { product_name:"Blackmagic BiDirectional SDI/HDMI 3G (x3)",   category:"CONVERTER",qty_raw:3,  body_name:"BiDirectional SDI/HDMI 3G" },
    { product_name:"HDI/SDI to HDMI 3G (x5)",                     category:"CONVERTER",qty_raw:5,  serial:"13633772 13973231 13633834 13630891 13973297", purchase_date:"27/12/2025", purchase_from:"SHREENATHJI PRODUCTION", bill_number:"27/12/2025", purchase_price:35000 },
    { product_name:"Bidirectional 12G (x3)",                      category:"CONVERTER",qty_raw:3,  serial:"14214148 14088676 14088649", body_name:"Bidirectional 12G", purchase_from:"bill 2025-26/140" },
    { product_name:"Micro Converter BiDirect SDI/HDMI 12G PSU (x5)", category:"CONVERTER", qty_raw:5, serial:"14021130 14021154 14021132 14021138 14021146", purchase_date:"30/10/2025", purchase_from:"ARTIZ DIGITAL SOLUTION", bill_number:"147", purchase_price:100300, body_name:"Bidirectional 12G wPSU" },
    { product_name:"Micro Converter BiDirect SDI/HDMI 12G wPSU (x11)",category:"CONVERTER",qty_raw:11, serial:"14214114 14214115 14214112 14214182 14214189 14214186 14213773 14213772 14213848 14214133 14214142", body_name:"Bidirectional 12G wPSU" },
    { product_name:"Mini Converter SDI Distribution 01", category:"CONVERTER", qty_raw:1, serial:"13725874", purchase_from:"AVPL783/2025-26", body_name:"Mini Converter SDI Distribution" },
    { product_name:"Mini Converter SDI Distribution 02", category:"CONVERTER", qty_raw:1, serial:"13725881", body_name:"Mini Converter SDI Distribution" },
    // ── UPS ──
    { product_name:"APC Backup UPS",  category:"UPS", qty_raw:1, serial:"B22245030522", body_name:"APC Backup UPS" },
    { product_name:"Online UPS (x2)", category:"UPS", qty_raw:2, serial:"410042010E60888200681 410042010E60888200867", body_name:"Online UPS" },
    // ── Tripods ──
    { product_name:"E-Image Camera Tripod",    category:"TRIPOD", qty_raw:5, body_name:"E-Image Camera Tripod" },
    { product_name:"Wireless Tripod",          category:"TRIPOD", qty_raw:3, body_name:"Wirelass Tripod" },
    { product_name:"Studio Assist Tripod Leg", category:"TRIPOD", qty_raw:3, body_name:"Tripod Studio Assist" },
    { product_name:"Studio Assist Tripod Head",category:"TRIPOD", qty_raw:4, body_name:"Tripod Studio Assist" },
    // ── Internet ──
    { product_name:"Jio Air Fiber",             category:"INTERNET_DEVICE", qty_raw:2, serial:"RTHHGHKA0082410 RTHHGHKA0066206", body_name:"Jio Air Fiber" },
    { product_name:"Jio Adaptor",               category:"ACCESSORY",       qty_raw:2, body_name:"Jio Air Fiber" },
    { product_name:"Jio Air Fiber (2nd hand)",  category:"INTERNET_DEVICE", qty_raw:1, serial:"JIDU6101 JIDU51641", purchase_from:"GP/15" },
    { product_name:"Airtel Air Fiber (x2)",     category:"INTERNET_DEVICE", qty_raw:2, body_name:"Airtel Airfiber" },
    // ── Controllers / PC ──
    { product_name:"Stream Deck (x2)",    category:"CONTROLLER", qty_raw:2, purchase_date:"18/12/2025", purchase_from:"Apex (Amazon)", purchase_price:43180 },
    { product_name:"Power Panel",         category:"ACCESSORY",  qty_raw:1, body_name:"Power Pannel" },
    { product_name:"Source PC (x2)",      category:"ACCESSORY",  qty_raw:2, body_name:"Source PC" },
    { product_name:"Keyboard Mouse 2 Pair",category:"ACCESSORY", qty_raw:2, body_name:"Source PC" },
    { product_name:"Power Board (x5)",    category:"ACCESSORY",  qty_raw:5 },
    { product_name:"Power Bank (x3)",     category:"ACCESSORY",  qty_raw:3, body_name:"Power bank" },
    { product_name:"USB to C Cable (x18)",category:"CABLE",      qty_raw:18, body_name:"Power bank" },
    { product_name:"DeckLink Card",       category:"ACCESSORY",  qty_raw:1, purchase_from:"Sardhar", purchase_price:70000 },
    { product_name:"JBL Headphone",       category:"ACCESSORY",  qty_raw:1 },
    { product_name:"DP to HDMI (x7)",     category:"ACCESSORY",  qty_raw:7 },
    // ── Cables ──
    { product_name:"4K@60Hz 1.5M HDMI 2.0 Cable (x5)", category:"CABLE", qty_raw:5, purchase_date:"24/12/2025", purchase_from:"SHREENATHJI PRODUCTION", bill_number:"2025-26/201", resp_person:"Harsh Bhuro" },
    { product_name:"USB to SATA 3.0 (x2)",              category:"ACCESSORY", qty_raw:2, purchase_date:"26/12/2025", purchase_from:"apex infocom technology pvt ltd", purchase_price:5074, resp_person:"Smit" },
    { product_name:"BELDEN 4694R 12G SDI Cable",        category:"CABLE", qty_raw:"80 Mtr", purchase_date:"30/10/2025", purchase_from:"SHREENATHJI PRODUCTION", bill_number:"2025-26/140", purchase_price:22400 },
    { product_name:"NEUTRIK NBNC75BTU11 BNC Connector (x34)", category:"ACCESSORY", qty_raw:34, purchase_date:"30/10/2025", purchase_from:"SHREENATHJI PRODUCTION", bill_number:"2025-26/140", purchase_price:15300 },
    { product_name:"4694RBUHD312D50 4K Belden BNC Connector (x6)", category:"ACCESSORY", qty_raw:6, purchase_date:"30/10/2025", purchase_from:"SHREENATHJI PRODUCTION", purchase_price:2700 },
    { product_name:"Powercord (x9)",         category:"CABLE",  qty_raw:9,  purchase_price:142 },
    { product_name:"CANARE SDI Video Cable (batch1)", category:"CABLE", qty_raw:28, purchase_date:"12/12/2025", purchase_from:"Systronics India Ltd", bill_number:"210326040076", purchase_price:872 },
    { product_name:"CANARE SDI Video Cable (batch2)", category:"CABLE", qty_raw:28, purchase_date:"27/11/2025", purchase_from:"Systronics India Ltd", purchase_price:19824 },
    { product_name:"SDI 12G Big",   category:"CABLE", qty_raw:8 },
    { product_name:"SDI HD Big",    category:"CABLE", qty_raw:13 },
    { product_name:"SDI HD 10M",    category:"CABLE", qty_raw:13 },
    { product_name:"SDI 12G Small", category:"CABLE", qty_raw:37 },
    { product_name:"SDI HD Small",  category:"CABLE", qty_raw:11 },
    { product_name:"HDMI HD Big",   category:"CABLE", qty_raw:5 },
    { product_name:"HDMI 12G Big",  category:"CABLE", qty_raw:5 },
    { product_name:"HDMI 12G Small",category:"CABLE", qty_raw:25 },
    { product_name:"HDMI HD Small", category:"CABLE", qty_raw:31 },
    { product_name:"XLR-M to XLR-F 30M (x6)", category:"CABLE", qty_raw:6 },
    { product_name:"XLR-M to XLR-F 50M (x3)", category:"CABLE", qty_raw:3 },
    { product_name:"EP to Jack 15M (x2)",      category:"CABLE", qty_raw:2 },
    { product_name:"EP to Jack 30",            category:"CABLE", qty_raw:1, bill_number:"210326010166" },
    { product_name:"HDMI 4K Cable (x11)",      category:"CABLE", qty_raw:11 },
    { product_name:"SDI Cable 4K Mota (x11)",  category:"CABLE", qty_raw:11 },
    { product_name:"SDI Cable 4K 5mtr (x20)",  category:"CABLE", qty_raw:20 },
    { product_name:"SDI Blue Cable Mota (x18)",category:"CABLE", qty_raw:18 },
    { product_name:"SDI Snake Cable 5x1 12G (x4)", category:"CABLE", qty_raw:4, body_name:"SDI Snake Cable" },
    { product_name:"SDI Small 12G (x12)",      category:"CABLE", qty_raw:12 },
    // ── Sony Alpha 7S III group ──
    { product_name:"SONY Alpha 7S III",          category:"CAMERA",    qty_raw:1, serial:"5781062",    body_name:"SONY Alpha 7S III", resp_person:"Keyur", purchase_date:"18/08/2025", purchase_from:"Ghanshyam Photo" },
    { product_name:"Lexar 900Mbps 160GB (x2)",   category:"STORAGE",   qty_raw:2,                      body_name:"SONY Alpha 7S III", resp_person:"Keyur", purchase_date:"18/08/2025", purchase_from:"Ghanshyam Photo" },
    { product_name:"Sony NP-FZ100 (7SIII x3)",   category:"ACCESSORY", qty_raw:3,                      body_name:"SONY Alpha 7S III", resp_person:"Keyur", purchase_date:"18/08/2025", purchase_from:"Ghanshyam Photo" },
    { product_name:"Sony BC-QZ1 (7SIII)",         category:"ACCESSORY", qty_raw:1, serial:"24085PA1002992", body_name:"SONY Alpha 7S III", resp_person:"Keyur", purchase_date:"18/08/2025", purchase_from:"Ghanshyam Photo" },
    { product_name:"Sony 24-70mm 2.8 GM",         category:"LENS",      qty_raw:1, serial:"2214539",    body_name:"SONY Alpha 7S III", resp_person:"Keyur", purchase_date:"18/08/2025", purchase_from:"Ghanshyam Photo" },
    { product_name:"Sony 16-35mm f4 ZEISS",       category:"LENS",      qty_raw:1, serial:"2026357",    body_name:"SONY Alpha 7S III", resp_person:"Keyur", purchase_from:"Ghanshyam Photo" },
    { product_name:"Sigma 35mm f2",               category:"LENS",      qty_raw:1, serial:"55212998",   body_name:"SONY Alpha 7S III", resp_person:"Keyur" },
    { product_name:"Sony 50mm 1.8",               category:"LENS",      qty_raw:1, serial:"2232052",    body_name:"SONY Alpha 7S III", resp_person:"Keyur" },
    { product_name:"Sony 70-200mm 2.8 GM",        category:"LENS",      qty_raw:1,                      body_name:"SONY Alpha 7S III", resp_person:"Keyur" },
    { product_name:"Digitek LED Light",           category:"ACCESSORY", qty_raw:1,                      body_name:"Digitek LED",       resp_person:"Keyur", purchase_from:"Ghanshyam Photo" },
    { product_name:"DigiTek NP-F750",             category:"ACCESSORY", qty_raw:1,                      body_name:"Digitek LED",       resp_person:"Keyur", purchase_from:"Ghanshyam Photo" },
    { product_name:"Lexar CF Type A Reader",      category:"ACCESSORY", qty_raw:1,                      body_name:"SONY Alpha 7S III", resp_person:"Keyur", purchase_from:"Ghanshyam Photo" },
    // ── Sony Alpha 7 IV group ──
    { product_name:"Sony Alpha 7 IV",             category:"CAMERA",    qty_raw:1, serial:"8468677",    body_name:"Sony Alpha 7 IV",   resp_person:"Anikesh", purchase_from:"Ghanshyam Photo" },
    { product_name:"Sony 24-105mm f4 G",          category:"LENS",      qty_raw:1, serial:"5925074",    body_name:"Sony Alpha 7 IV",   resp_person:"Anikesh", purchase_from:"Ghanshyam Photo" },
    { product_name:"Sony 85mm 1.8",               category:"LENS",      qty_raw:1,                      body_name:"Sony Alpha 7 IV",   resp_person:"Anikesh" },
    { product_name:"GODOX V860",                  category:"ACCESSORY", qty_raw:1,                      body_name:"GODOX V860",        resp_person:"Anikesh", purchase_from:"Ghanshyam Photo" },
    { product_name:"Sony NP-FZ100 (7IV x2)",      category:"ACCESSORY", qty_raw:2,                      body_name:"Sony Alpha 7 IV",   resp_person:"Anikesh", purchase_from:"Ghanshyam Photo" },
    { product_name:"Sony BC-QZ1 (7IV)",           category:"ACCESSORY", qty_raw:1, serial:"24045PA1008451", body_name:"Sony Alpha 7 IV", resp_person:"Anikesh", purchase_from:"Ghanshyam Photo" },
    { product_name:"GODOX VB26 (x3)",             category:"ACCESSORY", qty_raw:3, serial:"24K27MZ",    body_name:"GODOX V860",        resp_person:"Anikesh", purchase_from:"Ghanshyam Photo" },
    { product_name:"GODOX VC26",                  category:"ACCESSORY", qty_raw:1, serial:"2411A1815B",  body_name:"GODOX V860",        resp_person:"Anikesh", purchase_from:"Ghanshyam Photo" },
    // ── DJI Ronin ──
    { product_name:"DJI Ronin RS 4 Pro",          category:"GIMBAL",    qty_raw:1, serial:"729DN74009899T", body_name:"Dji Ronin RS 4 Pro", resp_person:"Keyur", purchase_date:"18/08/2025", purchase_from:"Ghanshyam Photo" },
    // ── Sony PXW X70 ──
    { product_name:"Sony PXW X70",                category:"CAMERA",    qty_raw:1, serial:"1633828",    body_name:"Sony PXW X70" },
    { product_name:"Welborn Sony (X70)",          category:"ACCESSORY", qty_raw:2,                      body_name:"Sony PXW X70" },
    { product_name:"APRAMATT (X70)",              category:"ACCESSORY", qty_raw:1,                      body_name:"Sony PXW X70" },
    // ── Sony ILCE 7M5 group ──
    { product_name:"Sony ILCE-7M5",              category:"CAMERA",    qty_raw:1, serial:"2027594",    body_name:"Sony ILCE 7M5", purchase_date:"09/04/2026", purchase_from:"Shree Ghanshyam Photo - Nilu bhagat", bill_number:"GP/15", purchase_price:194915 },
    { product_name:"Sony CHARGER BC-ZD1 + 3x NP-FZ100 + Adapter", category:"ACCESSORY", qty_raw:1, body_name:"Sony ILCE 7M5", purchase_date:"09/04/2026", purchase_from:"Shree Ghanshyam Photo - Nilu bhagat", bill_number:"GP/15", purchase_price:20678 },
    { product_name:"320GB CF Express Type A Lexar Card",           category:"STORAGE",   qty_raw:1, body_name:"Sony ILCE 7M5", purchase_date:"09/04/2026", purchase_from:"Shree Ghanshyam Photo - Nilu bhagat", bill_number:"GP/15", purchase_price:30508 },
    { product_name:"SONY FE 24-240mm f3.5-5.6 OSS II",            category:"LENS",      qty_raw:1, serial:"2027594", body_name:"Sony ILCE 7M5", purchase_date:"09/04/2026", purchase_from:"Shree Ghanshyam Photo - Nilu bhagat", bill_number:"GP/15", purchase_price:61017 },
    { product_name:"SONY 16-35 Z SAL Lens",                        category:"LENS",      qty_raw:1, serial:"2022113", body_name:"Sony ILCE 7M5", purchase_date:"09/04/2026", purchase_from:"Shree Ghanshyam Photo - Nilu bhagat", bill_number:"GP/15", purchase_price:66102 },
    { product_name:"Godox V860 III Sony Flash",                    category:"ACCESSORY", qty_raw:1, serial:"90066100", body_name:"Sony ILCE 7M5", purchase_date:"09/04/2026", purchase_from:"Shree Ghanshyam Photo - Nilu bhagat", purchase_price:12712 },
    // ── Lexar Card 800Mbps 160GB FX7 note ──
    { product_name:"Lexar Card 800Mbps 160GB (FX7-era)", category:"STORAGE", qty_raw:2, body_name:"Sony FX7", resp_person:"Keyur", purchase_from:"Ghanshyam Photo" },
  ];

  let eqCount = 0;
  for (const row of equipRows) {
    const { quantity, quantity_unit } = parseQty(row.qty_raw ?? 1);
    const isBulk = quantity > 1 || quantity_unit !== "pieces";
    const sold = isSold(row.bill_number);
    // Find kit by body_name
    const kitId = row.body_name && kitMap[row.body_name] ? kitMap[row.body_name] : null;
    const eq = await prisma.equipment.create({
      data: {
        product_name: row.product_name,
        category: row.category,
        item_type: isBulk ? "BULK" : "INDIVIDUAL",
        quantity: isBulk ? quantity : 1,
        quantity_unit,
        serial_number: row.serial || null,
        body_name: row.body_name || null,
        kit_id: kitId,
        resp_person: row.resp_person || null,
        purchase_date: parseDate(row.purchase_date),
        purchase_from: row.purchase_from || null,
        bill_number: (row.bill_number && !sold) ? row.bill_number : null,
        purchase_price: row.purchase_price ?? null,
        status: sold ? "SOLD" : "AVAILABLE",
        notes: row.notes || null,
        ownership_type: "INHOUSE",
        department: "VIDEO",
        created_at: NOW,
      }
    });
    // Set kit main_body if product_name matches body_name (this is the main body)
    if (kitId && row.body_name && row.product_name.startsWith(row.body_name.split(" ").slice(0,3).join(" "))) {
      await prisma.kit.update({ where:{id:kitId}, data:{ main_body_id: eq.id } }).catch(()=>{});
    }
    eqCount++;
  }
  console.log(`     ✓ ${eqCount} equipment items\n`);

  // ── 8. STAFF ───────────────────────────────────────────────────────────────────
  console.log("  → staff");
  // FREELANCER→EXTERNAL, department "Video"→"VIDEO", with_equipment "Yes"→1 "No"→0
  // INHOUSE + with_equipment=1 = partner staff
  const staffRows = [
    { name:"Anikesh Kalubhai Lakhani", phone:"9712534023", role:"Photographer",     staff_type:"EXTERNAL", department:"VIDEO", with_equipment:0, aadhar_number:"232679052848", is_active:1 },
    { name:"Khunt Ravi",               phone:"9727548284", role:"Videographer",      staff_type:"EXTERNAL", department:"VIDEO", with_equipment:0, aadhar_number:"832378411812", is_active:1 },
    { name:"Dev Desai",                phone:"9512397123", role:"Photographer",     staff_type:"EXTERNAL", department:"VIDEO", with_equipment:0, aadhar_number:"244174416350", is_active:1 },
    { name:"Aryan Savaliya",           phone:"9106224189", role:"Videographer",      staff_type:"INHOUSE",  department:"VIDEO", with_equipment:0, aadhar_number:"551878722629", is_active:1 },
    { name:"Gohil Akash V",            phone:"9375296396", role:"Videographer",      staff_type:"EXTERNAL", department:"VIDEO", with_equipment:0, aadhar_number:"779624603621", is_active:1 },
    { name:"Kachhadiya Prince",        phone:"7016371073", role:"Videographer",      staff_type:"INHOUSE",  department:"VIDEO", with_equipment:0, aadhar_number:"232635456944", is_active:1 },
    { name:"Patel Harsh",              phone:"6353858904", role:"Mixer Operator",    staff_type:"INHOUSE",  department:"VIDEO", with_equipment:0, aadhar_number:"655827513850", is_active:1 },
    { name:"Visavadiya Keyur N.",      phone:"9638775151", role:"Videographer",      staff_type:"INHOUSE",  department:"VIDEO", with_equipment:0, aadhar_number:"251150425579", is_active:1 },
    { name:"Prince Vora",              phone:"9904943839", role:"Editor",            staff_type:"INHOUSE",  department:"VIDEO", with_equipment:0, aadhar_number:"255684103376", is_active:1 },
    { name:"Vishal Muliya",            phone:"8460424437", role:"Mixer Operator",    staff_type:"EXTERNAL", department:"VIDEO", with_equipment:0, aadhar_number:null,           is_active:1 },
    // Partner staff (INHOUSE + own equipment)
    { name:"Keyur Dobariya",           phone:"7285066725", role:"Videographer",      staff_type:"INHOUSE",  department:"VIDEO", with_equipment:1, equipment_desc:"Z150 Camera", aadhar_number:null, is_active:1 },
    { name:"Mayur Senjaliya",          phone:"8264673230", role:"Videographer",      staff_type:"INHOUSE",  department:"VIDEO", with_equipment:1, equipment_desc:"Z150 Camera", aadhar_number:null, is_active:1 },
    { name:"Yug Ladola",               phone:"8140230832", role:"Videographer",      staff_type:"INHOUSE",  department:"VIDEO", with_equipment:1, equipment_desc:"Z150 Camera", aadhar_number:null, is_active:1 },
    { name:"Avinash Savaliya",         phone:"7096419311", role:"Videographer",      staff_type:"EXTERNAL", department:"VIDEO", with_equipment:0, aadhar_number:null,           is_active:1 },
    { name:"Smit Parekh",              phone:"7359946955", role:"Videographer",      staff_type:"EXTERNAL", department:"VIDEO", with_equipment:0, aadhar_number:null,           is_active:1 },
    { name:"Divyesh Pedadiya",         phone:"9274378676", role:"FPV Operator",      staff_type:"INHOUSE",  department:"VIDEO", with_equipment:1, equipment_desc:"FPV Drone",   aadhar_number:null, is_active:1 },
    { name:"Raj Gondaliya",            phone:"9624114920", role:"Drone Operator",    staff_type:"EXTERNAL", department:"VIDEO", with_equipment:0, aadhar_number:null,           is_active:1 },
    { name:"Paras Chavda",             phone:"9913112581", role:"Photographer",     staff_type:"EXTERNAL", department:"VIDEO", with_equipment:0, aadhar_number:null,           is_active:1 },
    { name:"Kevin Kapuriya",           phone:"9638637953", role:"Photographer",     staff_type:"EXTERNAL", department:"VIDEO", with_equipment:0, aadhar_number:null,           is_active:1 },
    { name:"Ashwinbhai Savaliya",      phone:"9825791591", role:"Videographer",      staff_type:"EXTERNAL", department:"VIDEO", with_equipment:0, aadhar_number:null,           is_active:1 },
    { name:"Nikunj Barvaliya",         phone:"9924142058", role:"Videographer",      staff_type:"EXTERNAL", department:"VIDEO", with_equipment:0, aadhar_number:null,           is_active:1 },
    { name:"Dev Parmar",               phone:"9904453721", role:"Videographer",      staff_type:"EXTERNAL", department:"VIDEO", with_equipment:0, aadhar_number:null,           is_active:1 },
    { name:"Parth Valani",             phone:"6353231004", role:"Editor",            staff_type:"INHOUSE",  department:"VIDEO", with_equipment:0, aadhar_number:null,           is_active:1 },
    { name:"Vikas Dangodara",          phone:"9016143438", role:"Mixer Operator",    staff_type:"INHOUSE",  department:"VIDEO", with_equipment:0, aadhar_number:null,           is_active:1 },
    { name:"Hetul Gandhi",             phone:"8799406477", role:"FPV Operator",      staff_type:"EXTERNAL", department:"VIDEO", with_equipment:0, aadhar_number:null,           is_active:1 },
    { name:"Mohit Golakiya",           phone:"7487933506", role:"Editor",            staff_type:"EXTERNAL", department:"VIDEO", with_equipment:0, aadhar_number:null,           is_active:1 },
    { name:"Rushit Vora",              phone:"9724783870", role:"Editor",            staff_type:"INHOUSE",  department:"VIDEO", with_equipment:0, aadhar_number:null,           is_active:1 },
    { name:"Dhruvik Shingala",         phone:"7228864796", role:"Graphics Designer", staff_type:"INHOUSE",  department:"VIDEO", with_equipment:0, aadhar_number:null,           is_active:1 },
  ];

  let staffCount = 0;
  for (const s of staffRows) {
    await prisma.staff.create({
      data: {
        name: s.name, phone: s.phone, role: s.role,
        staff_type: s.staff_type, department: s.department,
        payment_type: "", // empty as requested
        rate_per_day: null, monthly_salary: null, // empty as requested
        with_equipment: s.with_equipment,
        equipment_desc: (s as any).equipment_desc || null,
        equipment_rate_per_day: null,
        aadhar_number: s.aadhar_number || null,
        aadhar_front: null, aadhar_back: null,
        is_active: s.is_active, created_at: NOW,
      }
    });
    staffCount++;
  }
  console.log(`     ✓ ${staffCount} staff\n`);

  console.log("✅ Seed complete!");
  console.log(`   • 1 user (admin/admin)`);
  console.log(`   • ${rpData.length} role permissions`);
  console.log(`   • ${olData.length} option list entries`);
  console.log(`   • 17 clients`);
  console.log(`   • 3 vendors`);
  console.log(`   • ${uniqueKitNames.length} kits`);
  console.log(`   • ${eqCount} equipment items`);
  console.log(`   • ${staffCount} staff`);
}

main()
  .catch(e => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
