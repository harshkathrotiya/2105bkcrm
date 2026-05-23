/**
 * prisma/seed.ts — Full demo seed for BK CRM on Supabase PostgreSQL
 * Run: npx tsx prisma/seed.ts
 */
import { PrismaClient } from "@prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(__dirname, "../.env") });

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

// ── helpers ──────────────────────────────────────────────────────────────────
const now = new Date();
const y = now.getFullYear();
const m = String(now.getMonth() + 1).padStart(2, "0");
const d = (day: number) => `${y}-${m}-${String(day).padStart(2, "0")}`;
const prevM = String(now.getMonth()).padStart(2, "0") || "12";
const prevY = now.getMonth() === 0 ? y - 1 : y;
const dp = (day: number) => `${prevY}-${prevM}-${String(day).padStart(2, "0")}`;

async function main() {
  console.log("🌱 Seeding BK CRM database...");

  // ── 1. CLIENTS ─────────────────────────────────────────────────────────────
  console.log("  → clients");
  await prisma.client.deleteMany();

  const clients = await prisma.client.createMany({
    data: [
      { id: "client-1", initials: "AG", bg: "#EEEDFE", fg: "#3C3489", name: "Adani Group",       contact: "Vikram Shah",   mobile: "9825011111", email: "vikram@adani.com",        gst: "24AAACA1234R1ZX", pan: "AAACA1234R", address_line: "Shantipura, SG Highway", city: "Ahmedabad",   district: "Ahmedabad",   state: "Gujarat", pin: "380015", status: "Active",   created_at: d(1) },
      { id: "client-2", initials: "TP", bg: "#E1F5EE", fg: "#085041", name: "Torrent Pharma",    contact: "Priya Mehta",   mobile: "9825022222", email: "priya@torrentpharma.com", gst: "24BBBBB5678R1ZX", pan: "BBBBB5678R", address_line: "Ashram Road",            city: "Ahmedabad",   district: "Ahmedabad",   state: "Gujarat", pin: "380009", status: "Active",   created_at: d(2) },
      { id: "client-3", initials: "PF", bg: "#FAECE7", fg: "#712B13", name: "Patel Family",      contact: "Rajesh Patel",  mobile: "9825033333", email: "rajesh@email.com",        gst: "",                pan: "",           address_line: "Gorwa",                  city: "Vadodara",    district: "Vadodara",    state: "Gujarat", pin: "390016", status: "Active",   created_at: d(3) },
      { id: "client-4", initials: "DT", bg: "#E6F1FB", fg: "#0C447C", name: "Dholera Trust",     contact: "Swami Mahraj",  mobile: "9825044444", email: "swami@dholeratrust.org",  gst: "24CCCCC9012R1ZX", pan: "CCCCC9012R", address_line: "Dholera",                city: "Dholera",     district: "Ahmedabad",   state: "Gujarat", pin: "382455", status: "Active",   created_at: d(4) },
      { id: "client-5", initials: "GC", bg: "#FAEEDA", fg: "#633806", name: "GIFT City Corp",    contact: "Amit Kumar",    mobile: "9825055555", email: "amit@giftcity.in",        gst: "",                pan: "",           address_line: "GIFT City",              city: "Gandhinagar", district: "Gandhinagar", state: "Gujarat", pin: "382355", status: "Inactive", created_at: d(5) },
      { id: "client-6", initials: "RG", bg: "#F1EFE8", fg: "#444441", name: "Reliance Group",    contact: "Suresh Ambani", mobile: "9825066666", email: "suresh@reliance.com",     gst: "27AAAAA1234R1ZX", pan: "AAAAA1234R", address_line: "Nariman Point",          city: "Mumbai",      district: "Mumbai",      state: "Maharashtra", pin: "400021", status: "Active", created_at: d(6) },
      { id: "client-7", initials: "TM", bg: "#FCEBEB", fg: "#791F1F", name: "Tata Motors",       contact: "Ratan Tata Jr", mobile: "9825077777", email: "ratan@tatamotors.com",    gst: "27BBBBB5678R1ZX", pan: "BBBBB5678R", address_line: "Bombay House",           city: "Mumbai",      district: "Mumbai",      state: "Maharashtra", pin: "400001", status: "Active", created_at: d(7) },
      { id: "client-8", initials: "IS", bg: "#FBEAF0", fg: "#72243E", name: "ISRO Ahmedabad",    contact: "Dr. Mehta",     mobile: "9825088888", email: "mehta@isro.gov.in",       gst: "",                pan: "",           address_line: "Jodhpur Tekra",          city: "Ahmedabad",   district: "Ahmedabad",   state: "Gujarat", pin: "380015", status: "Active", created_at: d(8) },
    ],
  });
  console.log(`     ✓ ${clients.count} clients`);

  // ── 2. INQUIRIES ───────────────────────────────────────────────────────────
  console.log("  → inquiries");
  await prisma.inquiry.deleteMany();

  await prisma.inquiry.createMany({
    data: [
      { id: "inq-1", client_id: "client-1", event_type: "Corporate Event",  start_date: d(10), end_date: d(12), start_time: "09:00 AM", end_time: "09:00 PM", venue: "Grand Bhagwati, Ahmedabad",    notes: "Annual conference with product launch",  status: "Confirmed", created_at: d(9)  },
      { id: "inq-2", client_id: "client-2", event_type: "Product Launch",   start_date: d(14), end_date: d(15), start_time: "04:00 PM", end_time: "10:00 PM", venue: "Torrent House, Ahmedabad",     notes: "New drug launch event",                  status: "Quoted",    created_at: d(9)  },
      { id: "inq-3", client_id: "client-3", event_type: "Wedding",          start_date: d(21), end_date: d(22), start_time: "06:00 AM", end_time: "11:00 PM", venue: "Patel Farm, Vadodara",         notes: "Full day coverage needed",               status: "New",       created_at: d(10) },
      { id: "inq-4", client_id: "client-4", event_type: "Dholera Mahotsav", start_date: dp(15), end_date: dp(20), start_time: "08:00 AM", end_time: "10:00 PM", venue: "Dholera Grounds",            notes: "Annual Festival - 6 days",               status: "Confirmed", created_at: dp(10) },
      { id: "inq-5", client_id: "client-6", event_type: "AGM",              start_date: d(25), end_date: d(25), start_time: "10:00 AM", end_time: "06:00 PM", venue: "Reliance HQ, Mumbai",          notes: "Annual General Meeting",                 status: "Quoted",    created_at: d(12) },
      { id: "inq-6", client_id: "client-7", event_type: "Press Conference", start_date: d(18), end_date: d(18), start_time: "11:00 AM", end_time: "02:00 PM", venue: "Tata Motors Showroom, Mumbai", notes: "New EV launch press conference",         status: "New",       created_at: d(13) },
      { id: "inq-7", client_id: "client-8", event_type: "Award Ceremony",   start_date: d(28), end_date: d(28), start_time: "05:00 PM", end_time: "09:00 PM", venue: "ISRO SAC, Ahmedabad",          notes: "Annual awards night",                    status: "New",       created_at: d(14) },
      { id: "inq-8", client_id: "client-5", event_type: "Seminar",          start_date: dp(5),  end_date: dp(6),  start_time: "09:00 AM", end_time: "05:00 PM", venue: "GIFT City Convention Centre", notes: "Investment seminar",                     status: "Cancelled", created_at: dp(1) },
    ],
  });
  console.log("     ✓ 8 inquiries");

  // ── 3. QUOTATIONS ──────────────────────────────────────────────────────────
  console.log("  → quotations");
  await prisma.quotation.deleteMany();

  const eq1 = JSON.stringify([
    { no: 1, position: "Center Tally",       equip: "FS6",            rate: 20000, days: 3, amount: 60000 },
    { no: 2, position: "Center Semi Wide",   equip: "FS6",            rate: 20000, days: 3, amount: 60000 },
    { no: 3, position: "Wireless 1",         equip: "FX3 + Wireless", rate: 10000, days: 3, amount: 30000 },
    { no: 4, position: "Photo 1",            equip: "DSLR",           rate:  8000, days: 3, amount: 24000 },
    { no: 5, position: "Video Crane 32 Ft",  equip: "Crane 32 Feet",  rate: 15000, days: 3, amount: 45000 },
  ]);
  const eq2 = JSON.stringify([
    { no: 1, position: "Main Camera",        equip: "FX6",            rate: 20000, days: 2, amount: 40000 },
    { no: 2, position: "Drone",              equip: "DJI Mavic 3",    rate: 12000, days: 2, amount: 24000 },
    { no: 3, position: "LED Wall",           equip: "LED Panel 10x6", rate: 25000, days: 2, amount: 50000 },
  ]);
  const eq3 = JSON.stringify([
    { no: 1, position: "Main Camera",        equip: "FX6",            rate: 20000, days: 1, amount: 20000 },
    { no: 2, position: "Backup Camera",      equip: "FX3",            rate: 10000, days: 1, amount: 10000 },
    { no: 3, position: "Audio",              equip: "Zoom H6",        rate:  5000, days: 1, amount:  5000 },
  ]);

  await prisma.quotation.createMany({
    data: [
      { id: "quote-1", inquiry_id: "inq-1", client_name: "Adani Group",    event_name: "Annual Conference",  quote_no: `BKM/${y}/${m}/01`, start_date: d(10), end_date: d(12), days: 3, venue: "Grand Bhagwati, Ahmedabad",    status: "Approved", equipment: eq1, subtotal: 219000, cgst: 19710, sgst: 19710, total: 258420, created_at: d(9),  sent_at: d(9),  approved_at: d(10) },
      { id: "quote-2", inquiry_id: "inq-2", client_name: "Torrent Pharma", event_name: "Drug Launch Event",  quote_no: `BKM/${y}/${m}/02`, start_date: d(14), end_date: d(15), days: 2, venue: "Torrent House, Ahmedabad",     status: "Sent",     equipment: eq2, subtotal: 114000, cgst: 10260, sgst: 10260, total: 134520, created_at: d(10), sent_at: d(11), approved_at: null },
      { id: "quote-3", inquiry_id: "inq-5", client_name: "Reliance Group", event_name: "AGM Coverage",       quote_no: `BKM/${y}/${m}/03`, start_date: d(25), end_date: d(25), days: 1, venue: "Reliance HQ, Mumbai",          status: "Draft",    equipment: eq3, subtotal:  35000, cgst:  3150, sgst:  3150, total:  41300, created_at: d(13), sent_at: null,  approved_at: null },
    ],
  });
  console.log("     ✓ 3 quotations");

  // ── 4. INVOICES ────────────────────────────────────────────────────────────
  console.log("  → invoices");
  await prisma.invoice.deleteMany();

  await prisma.invoice.createMany({
    data: [
      { id: "inv-1", quotation_id: "quote-1", invoice_no: `BKM-INV-${y}/${m}/01`, client_name: "Adani Group",    event_name: "Annual Conference", start_date: d(10), end_date: d(12), venue: "Grand Bhagwati, Ahmedabad",    videography_amount: 180000, photography_amount: 39000, advance: 129210, balance: 129210, status: "Partial paid", advance_received: 1, advance_received_at: d(11), advance_ref: "UPI123456",   advance_method: "UPI",          balance_received: 0, balance_received_at: null, balance_ref: "",          balance_method: "",             hdd_delivered: 0, created_at: d(13), due_date: d(20) },
      { id: "inv-2", quotation_id: "quote-2", invoice_no: `BKM-INV-${y}/${m}/02`, client_name: "Torrent Pharma", event_name: "Drug Launch Event",  start_date: d(14), end_date: d(15), venue: "Torrent House, Ahmedabad",     videography_amount:  90000, photography_amount: 24000, advance:  57240, balance:  57240, status: "Unpaid",       advance_received: 0, advance_received_at: null,  advance_ref: "",            advance_method: "",             balance_received: 0, balance_received_at: null, balance_ref: "",          balance_method: "",             hdd_delivered: 0, created_at: d(14), due_date: d(21) },
      { id: "inv-3", quotation_id: "quote-1", invoice_no: `BKM-INV-${y}/${m}/03`, client_name: "Adani Group",    event_name: "Annual Conference", start_date: d(10), end_date: d(12), venue: "Grand Bhagwati, Ahmedabad",    videography_amount:  78420, photography_amount:      0, advance:  78420, balance:      0, status: "Paid",         advance_received: 1, advance_received_at: d(13), advance_ref: "NEFT987654",  advance_method: "Bank Transfer", balance_received: 1, balance_received_at: d(15), balance_ref: "NEFT111222", balance_method: "Bank Transfer", hdd_delivered: 1, created_at: d(15), due_date: d(22) },
    ],
  });
  console.log("     ✓ 3 invoices");

  // ── 5. CALENDAR EVENTS ─────────────────────────────────────────────────────
  console.log("  → calendar events");
  await prisma.calendarEvent.deleteMany();

  const calMonth = now.getMonth() + 1;
  const calYear  = now.getFullYear();
  await prisma.calendarEvent.createMany({
    data: [
      { id: "cal-1",  date: 10, month: calMonth, year: calYear, label: "Adani Meet",      type: "confirmed" },
      { id: "cal-2",  date: 11, month: calMonth, year: calYear, label: "↔ Adani",         type: "confirmed" },
      { id: "cal-3",  date: 12, month: calMonth, year: calYear, label: "↔ Adani",         type: "confirmed" },
      { id: "cal-4",  date: 14, month: calMonth, year: calYear, label: "Torrent Launch",  type: "quotation" },
      { id: "cal-5",  date: 15, month: calMonth, year: calYear, label: "↔ Torrent",       type: "quotation" },
      { id: "cal-6",  date: 21, month: calMonth, year: calYear, label: "Patel Wedding",   type: "inquiry"   },
      { id: "cal-7",  date: 22, month: calMonth, year: calYear, label: "↔ Patel",         type: "inquiry"   },
      { id: "cal-8",  date: 25, month: calMonth, year: calYear, label: "Reliance AGM",    type: "quotation" },
      { id: "cal-9",  date: 18, month: calMonth, year: calYear, label: "Tata Press",      type: "inquiry"   },
      { id: "cal-10", date: 28, month: calMonth, year: calYear, label: "ISRO Awards",     type: "inquiry"   },
    ],
  });
  console.log("     ✓ 10 calendar events");

  // ── 6. VENDORS ─────────────────────────────────────────────────────────────
  console.log("  → vendors");
  await prisma.vendor.deleteMany();

  await prisma.vendor.createMany({
    data: [
      { name: "Apex Rental Services",   phone: "9925012345", email: "info@apexrentals.com",    specialization: "Crane, Heavy Equipment", city: "Ahmedabad",   gst_number: "24APEXR1234R1ZX",  notes: "Prefers bank transfer.",          is_active: 1, created_at: d(1) },
      { name: "Shreeji Camera Rental",  phone: "9876543210", email: "rent@shreejicamera.com",  specialization: "Drone, Camera, Lenses",  city: "Vadodara",    gst_number: null,                notes: "Contact: Jignesh Bhai.",          is_active: 1, created_at: d(1) },
      { name: "Falcon Drones & FPV",    phone: "9123456789", email: "fly@falcondrones.com",    specialization: "Drone, FPV",             city: "Ahmedabad",   gst_number: "24FALCON9876A1Z",   notes: "Requires 1 day advance booking.", is_active: 1, created_at: d(1) },
      { name: "Audio Masters Rental",   phone: "9898098980", email: "audio@masters.com",       specialization: "Audio Mixer, Mics",      city: "Gandhinagar", gst_number: null,                notes: "High quality wireless mics.",     is_active: 1, created_at: d(1) },
      { name: "Vasu Video Solutions",   phone: "9090990909", email: "vasuvideo@gmail.com",     specialization: "Video Mixer, Switchers", city: "Ahmedabad",   gst_number: null,                notes: "Reliable production switcher.",   is_active: 1, created_at: d(1) },
      { name: "Bright LED Rentals",     phone: "9712345678", email: "led@brightrentals.com",   specialization: "LED Wall, Panels",       city: "Surat",       gst_number: "24BRIGHT1234R1ZX",  notes: "Large LED walls available.",      is_active: 1, created_at: d(2) },
      { name: "SoundWave Audio",        phone: "9898765432", email: "sound@soundwave.in",      specialization: "PA System, Speakers",    city: "Ahmedabad",   gst_number: null,                notes: "Good for outdoor events.",        is_active: 0, created_at: d(2) },
    ],
  });
  console.log("     ✓ 7 vendors");

  // ── 7. KITS ────────────────────────────────────────────────────────────────
  console.log("  → kits");
  await prisma.equipment.deleteMany();
  await prisma.kit.deleteMany();

  const kitNames = [
    "Sony FX6 Kit", "Sony FX3 Kit", "Sony Alpha 7S III Kit", "Sony Alpha 7 IV Kit",
    "Sony ILCE 7M5 Kit", "Z150-01 Kit", "Z150-02 Kit", "Z150-03 Kit", "Z150-05 Kit",
    "Hollyland Mars 4K Kit-01", "Hollyland Mars 4K Kit-02", "Hollyland Mars 4K Kit-03",
    "Accsoon Master 4K Kit", "Live-U Solo HD Kit", "Eartec Talkback Kit", "Tally System Kit",
  ];

  const kitMap: Record<string, number> = {};
  for (const name of kitNames) {
    const kit = await prisma.kit.create({ data: { name, description: `BK Media standard ${name}.`, created_at: d(1) } });
    kitMap[name] = kit.id;
  }
  console.log(`     ✓ ${kitNames.length} kits`);

  // ── 8. EQUIPMENT ───────────────────────────────────────────────────────────
  console.log("  → equipment (cameras, mixers, recorders, audio, wireless, UPS)");

  // Cameras
  const cameras = [
    { product_name: "Sony FX6",          category: "CAMERA", quantity: 1, serial_number: "7000701",    body_name: "Sony FX6",          kit_id: kitMap["Sony FX6 Kit"],          resp_person: "Vikram", purchase_price: 450000 },
    { product_name: "Sony FX3",          category: "CAMERA", quantity: 1, serial_number: "1002576",    body_name: "Sony FX3",          kit_id: kitMap["Sony FX3 Kit"],          resp_person: "Priya",  purchase_price: 340000 },
    { product_name: "Sony Alpha 7S III", category: "CAMERA", quantity: 1, serial_number: "5781062",    body_name: "Sony Alpha 7S III", kit_id: kitMap["Sony Alpha 7S III Kit"], resp_person: "Rohan",  purchase_price: 250000 },
    { product_name: "Sony Alpha 7 IV",   category: "CAMERA", quantity: 1, serial_number: "8468677",    body_name: "Sony Alpha 7 IV",   kit_id: kitMap["Sony Alpha 7 IV Kit"],   resp_person: "Rahul",  purchase_price: 200000 },
    { product_name: "Sony ILCE 7M5",     category: "CAMERA", quantity: 1, serial_number: "2027594",    body_name: "Sony ILCE 7M5",     kit_id: kitMap["Sony ILCE 7M5 Kit"],     resp_person: "Manish", purchase_price: 194915 },
    { product_name: "Sony Z150-01",      category: "CAMERA", quantity: 1, serial_number: "7003244",    body_name: "Sony Z150-01",      kit_id: kitMap["Z150-01 Kit"],           resp_person: "Sanjay", purchase_price: 285000 },
    { product_name: "Sony Z150-02",      category: "CAMERA", quantity: 1, serial_number: "7003683",    body_name: "Sony Z150-02",      kit_id: kitMap["Z150-02 Kit"],           resp_person: "Jayesh", purchase_price: 285000 },
    { product_name: "Sony Z150-03",      category: "CAMERA", quantity: 1, serial_number: "7001810",    body_name: "Sony Z150-03",      kit_id: kitMap["Z150-03 Kit"],           resp_person: "Sanjay", purchase_price: 285000 },
    { product_name: "Sony Z150-05",      category: "CAMERA", quantity: 1, serial_number: "7004593",    body_name: "Sony Z150-05",      kit_id: kitMap["Z150-05 Kit"],           resp_person: "Jayesh", purchase_price: 285000 },
    { product_name: "Sony Z150-04",      category: "CAMERA", quantity: 1, serial_number: "7004123",    body_name: "Sony Z150-04",      kit_id: null,                            resp_person: "Sanjay", purchase_price: 285000 },
  ];

  for (const cam of cameras) {
    const eq = await prisma.equipment.create({ data: { ...cam, status: "AVAILABLE", created_at: d(1) } });
    if (cam.kit_id) {
      await prisma.kit.update({ where: { id: cam.kit_id }, data: { main_body_id: eq.id } });
    }
  }

  // Video Mixers
  await prisma.equipment.createMany({ data: [
    { product_name: "BM Videohub 20x20 12G", category: "VIDEO_MIXER",    quantity: 1, serial_number: "VH-2020-01", resp_person: "Amit",   purchase_price: 247800, status: "AVAILABLE", created_at: d(1) },
    { product_name: "Stream Deck 01",        category: "VIDEO_MIXER",    quantity: 1, serial_number: "SD-01",      resp_person: "Vikram", purchase_price:  21590, status: "AVAILABLE", created_at: d(1) },
    { product_name: "Stream Deck 02",        category: "VIDEO_MIXER",    quantity: 1, serial_number: "SD-02",      resp_person: "Vikram", purchase_price:  21590, status: "AVAILABLE", created_at: d(1) },
    { product_name: "BM ATEM Mini",          category: "VIDEO_MIXER",    quantity: 1, serial_number: "AM-01",      resp_person: "Amit",   purchase_price:  30000, status: "AVAILABLE", created_at: d(1) },
    { product_name: "BM ATEM Extreme",       category: "VIDEO_MIXER",    quantity: 1, serial_number: "AE-01",      resp_person: "Amit",   purchase_price:  80000, status: "AVAILABLE", created_at: d(1) },
    { product_name: "Roland V-1HD Mixer",    category: "VIDEO_MIXER",    quantity: 1, serial_number: "RM-01",      resp_person: "Amit",   purchase_price:  75000, status: "AVAILABLE", created_at: d(1) },
    { product_name: "Feelworld Live Mixer",  category: "VIDEO_MIXER",    quantity: 1, serial_number: "FM-01",      resp_person: "Vikram", purchase_price:  45000, status: "AVAILABLE", created_at: d(1) },
    { product_name: "DevMixer 4K",           category: "VIDEO_MIXER",    quantity: 1, serial_number: "DM-01",      resp_person: "Manish", purchase_price: 120000, status: "AVAILABLE", created_at: d(1) },
    { product_name: "Atomos Shogun 7",       category: "VIDEO_RECORDER", quantity: 1, serial_number: "AS-01",      resp_person: "Rohan",  purchase_price: 110000, status: "AVAILABLE", created_at: d(1) },
    { product_name: "Atomos Ninja V",        category: "VIDEO_RECORDER", quantity: 1, serial_number: "AN-01",      resp_person: "Rohan",  purchase_price:  65000, status: "AVAILABLE", created_at: d(1) },
    { product_name: "BM HyperDeck Studio",   category: "VIDEO_RECORDER", quantity: 1, serial_number: "HS-01",      resp_person: "Amit",   purchase_price:  95000, status: "AVAILABLE", created_at: d(1) },
    { product_name: "BM Video Assist 7\"",   category: "VIDEO_RECORDER", quantity: 1, serial_number: "VA-07",      resp_person: "Amit",   purchase_price:  85000, status: "AVAILABLE", created_at: d(1) },
    { product_name: "BM Video Assist 5\"",   category: "VIDEO_RECORDER", quantity: 1, serial_number: "VA-05",      resp_person: "Vikram", purchase_price:  55000, status: "AVAILABLE", created_at: d(1) },
    { product_name: "BM HyperDeck Shuttle",  category: "VIDEO_RECORDER", quantity: 1, serial_number: "HS-02",      resp_person: "Manish", purchase_price:  35000, status: "AVAILABLE", created_at: d(1) },
    { product_name: "Zoom H6",               category: "AUDIO_MIXER",    quantity: 1, serial_number: "ZH-01",      resp_person: "Vikram", purchase_price:  32000, status: "AVAILABLE", created_at: d(1) },
    { product_name: "Rodecaster Pro II",     category: "AUDIO_MIXER",    quantity: 1, serial_number: "RP-01",      resp_person: "Vikram", purchase_price:  65000, status: "AVAILABLE", created_at: d(1) },
    { product_name: "Yamaha MG10XU",         category: "AUDIO_MIXER",    quantity: 1, serial_number: "YM-01",      resp_person: "Vikram", purchase_price:  20000, status: "AVAILABLE", created_at: d(1) },
    { product_name: "Zoom F8n Pro",          category: "AUDIO_MIXER",    quantity: 1, serial_number: "ZF-01",      resp_person: "Manish", purchase_price:  95000, status: "AVAILABLE", created_at: d(1) },
    { product_name: "APC Easy UPS 1KVA",     category: "UPS",            quantity: 1, serial_number: "UP-01",      resp_person: "Vikram", purchase_price:  12000, status: "AVAILABLE", created_at: d(1) },
    { product_name: "APC Easy UPS 2KVA",     category: "UPS",            quantity: 1, serial_number: "UP-02",      resp_person: "Vikram", purchase_price:  22000, status: "AVAILABLE", created_at: d(1) },
    { product_name: "Microtek UPS 1KVA",     category: "UPS",            quantity: 1, serial_number: "UP-03",      resp_person: "Vikram", purchase_price:   8000, status: "AVAILABLE", created_at: d(1) },
  ]});

  // Wireless TX
  const wirelessItems = [
    { product_name: "Mars 4K-01",         serial_number: "0023050T-R",   body_name: "Mars 4K-01",        kit_id: kitMap["Hollyland Mars 4K Kit-01"], purchase_price: 45000 },
    { product_name: "Mars 4K-02",         serial_number: "0023470T-R",   body_name: "Mars 4K-02",        kit_id: kitMap["Hollyland Mars 4K Kit-02"], purchase_price: 45000 },
    { product_name: "Mars 4K-03",         serial_number: "0023471T-R",   body_name: "Mars 4K-03",        kit_id: kitMap["Hollyland Mars 4K Kit-03"], purchase_price: 45000 },
    { product_name: "Accsoon Master 4K",  serial_number: "WIT07-0905",   body_name: "Accsoon Master 4K", kit_id: kitMap["Accsoon Master 4K Kit"],    purchase_price: 38000 },
    { product_name: "Live-U Solo HD",     serial_number: "202120-23099", body_name: "Live-U Solo HD",    kit_id: kitMap["Live-U Solo HD Kit"],       purchase_price: 150000 },
    { product_name: "Hollyland Cosmo C1", serial_number: "CC-01",        body_name: null,                kit_id: null,                               purchase_price: 75000 },
    { product_name: "Teradek Bolt 4K",    serial_number: "TB-01",        body_name: null,                kit_id: null,                               purchase_price: 220000 },
  ];
  for (const w of wirelessItems) {
    const eq = await prisma.equipment.create({ data: { ...w, category: "WIRELESS_TX", quantity: 1, resp_person: "Rahul", status: "AVAILABLE", created_at: d(1) } });
    if (w.kit_id) await prisma.kit.update({ where: { id: w.kit_id }, data: { main_body_id: eq.id } });
  }

  // Accessories (key ones)
  const accessories = [
    { product_name: "Sony 200-600mm G 01",       serial_number: "1938001",    kit_id: null,                            purchase_price: 150000 },
    { product_name: "Sony 200-600mm G 02",       serial_number: "1916007",    kit_id: null,                            purchase_price: 150000 },
    { product_name: "Sony 400-800mm G",          serial_number: "1814652",    kit_id: null,                            purchase_price: 270000 },
    { product_name: "24-70mm 2.8 GM Lens",       serial_number: "GM-2470",    kit_id: kitMap["Sony Alpha 7S III Kit"], purchase_price: 180000 },
    { product_name: "70-200mm 2.8 Lens",         serial_number: "S70200",     kit_id: kitMap["Sony Alpha 7S III Kit"], purchase_price: 220000 },
    { product_name: "Sigma 35mm Lens",           serial_number: "SG-35",      kit_id: kitMap["Sony Alpha 7S III Kit"], purchase_price:  65000 },
    { product_name: "24-105mm G Lens",           serial_number: "G24105",     kit_id: kitMap["Sony Alpha 7 IV Kit"],   purchase_price:  90000 },
    { product_name: "85mm 1.8 Lens",             serial_number: "S85",        kit_id: kitMap["Sony Alpha 7 IV Kit"],   purchase_price:  42000 },
    { product_name: "GODOX V860 Flash",          serial_number: "GX-860",     kit_id: kitMap["Sony Alpha 7 IV Kit"],   purchase_price:  15000 },
    { product_name: "Sony 24-240mm Lens",        serial_number: "24240-01",   kit_id: kitMap["Sony ILCE 7M5 Kit"],     purchase_price:  61017 },
    { product_name: "Eartec 5 Pair (Main Body)", serial_number: "ET-01",      kit_id: kitMap["Eartec Talkback Kit"],   purchase_price: 120000 },
    { product_name: "Hollyland Tally 8 Pair",    serial_number: "HT-01",      kit_id: kitMap["Tally System Kit"],      purchase_price:  85000 },
    { product_name: "Belden 4694R 12G SDI Cable",serial_number: "BC-12G-01",  kit_id: null,                            purchase_price:  22400 },
    { product_name: "SDI to HDMI 3G #1",         serial_number: "SH-01",      kit_id: null,                            purchase_price:   7000 },
    { product_name: "SDI to HDMI 3G #2",         serial_number: "SH-02",      kit_id: null,                            purchase_price:   7000 },
    { product_name: "SDI to HDMI 3G #3",         serial_number: "SH-03",      kit_id: null,                            purchase_price:   7000 },
    { product_name: "BAOFENG Walkie Talkie #1",  serial_number: "BF-01",      kit_id: null,                            purchase_price:   1000 },
    { product_name: "BAOFENG Walkie Talkie #2",  serial_number: "BF-02",      kit_id: null,                            purchase_price:   1000 },
    { product_name: "BAOFENG Walkie Talkie #3",  serial_number: "BF-03",      kit_id: null,                            purchase_price:   1000 },
    { product_name: "BAOFENG Walkie Talkie #4",  serial_number: "BF-04",      kit_id: null,                            purchase_price:   1000 },
    { product_name: "Micro Converter BiDirect #1",serial_number: "MC12-01",   kit_id: null,                            purchase_price:  20060 },
    { product_name: "Micro Converter BiDirect #2",serial_number: "MC12-02",   kit_id: null,                            purchase_price:  20060 },
    { product_name: "Micro Converter BiDirect #3",serial_number: "MC12-03",   kit_id: null,                            purchase_price:  20060 },
    { product_name: "USB to SATA Adapter #1",    serial_number: "US-01",      kit_id: null,                            purchase_price:   2537 },
    { product_name: "USB to SATA Adapter #2",    serial_number: "US-02",      kit_id: null,                            purchase_price:   2537 },
  ];

  for (const acc of accessories) {
    const eq = await prisma.equipment.create({ data: { ...acc, category: "ACCESSORY", quantity: 1, resp_person: "Vikram", status: "AVAILABLE", created_at: d(1) } });
    if (acc.product_name === "Eartec 5 Pair (Main Body)") await prisma.kit.update({ where: { id: kitMap["Eartec Talkback Kit"] }, data: { main_body_id: eq.id } });
    if (acc.product_name === "Hollyland Tally 8 Pair")    await prisma.kit.update({ where: { id: kitMap["Tally System Kit"] },    data: { main_body_id: eq.id } });
  }
  console.log("     ✓ equipment seeded");

  // ── 9. STAFF ───────────────────────────────────────────────────────────────
  console.log("  → staff");
  await prisma.staffPayment.deleteMany();
  await prisma.staffAssignment.deleteMany();
  await prisma.staff.deleteMany();

  const staffList = [
    { name: "Rishi Kumar",  phone: "9825011111", role: "Videographer",    staff_type: "INHOUSE",   payment_type: "PER_DAY", rate_per_day: 1500, monthly_salary: null,  with_equipment: 0, equipment_desc: null,       aadhar_number: "452187342190", aadhar_front: "mock_front.jpg", aadhar_back: "mock_back.jpg", is_active: 1, created_at: d(1) },
    { name: "Dev Vora",     phone: "9825022222", role: "Videographer",    staff_type: "INHOUSE",   payment_type: "PER_DAY", rate_per_day: 1500, monthly_salary: null,  with_equipment: 0, equipment_desc: null,       aadhar_number: "123456789012", aadhar_front: null,             aadhar_back: null,            is_active: 1, created_at: d(1) },
    { name: "Mehul Shah",   phone: "9825033333", role: "Photographer",    staff_type: "INHOUSE",   payment_type: "MONTHLY", rate_per_day: null, monthly_salary: 45000, with_equipment: 0, equipment_desc: null,       aadhar_number: "223456789012", aadhar_front: null,             aadhar_back: null,            is_active: 1, created_at: d(1) },
    { name: "Hetal Patel",  phone: "9825044444", role: "LED operator",    staff_type: "INHOUSE",   payment_type: "PER_DAY", rate_per_day: 1200, monthly_salary: null,  with_equipment: 0, equipment_desc: null,       aadhar_number: "323456789012", aadhar_front: null,             aadhar_back: null,            is_active: 1, created_at: d(1) },
    { name: "Jignesh Rao",  phone: "9825055555", role: "Crane operator",  staff_type: "EXTERNAL",  payment_type: "PER_DAY", rate_per_day: 2500, monthly_salary: null,  with_equipment: 1, equipment_desc: "Crane 32ft", aadhar_number: "423456789012", aadhar_front: null,             aadhar_back: null,            is_active: 1, created_at: d(1) },
    { name: "Karan Patel",  phone: "9825066666", role: "Drone operator",  staff_type: "EXTERNAL",  payment_type: "PER_DAY", rate_per_day: 3000, monthly_salary: null,  with_equipment: 1, equipment_desc: "DJI Drone",  aadhar_number: "523456789012", aadhar_front: null,             aadhar_back: null,            is_active: 1, created_at: d(1) },
    { name: "Priya Joshi",  phone: "9825077777", role: "Editor",          staff_type: "INHOUSE",   payment_type: "MONTHLY", rate_per_day: null, monthly_salary: 35000, with_equipment: 0, equipment_desc: null,       aadhar_number: "623456789012", aadhar_front: null,             aadhar_back: null,            is_active: 1, created_at: d(1) },
    { name: "Nirav Parmar", phone: "9825088888", role: "Videographer",    staff_type: "INHOUSE",   payment_type: "PER_DAY", rate_per_day: 1200, monthly_salary: null,  with_equipment: 0, equipment_desc: null,       aadhar_number: "723456789012", aadhar_front: null,             aadhar_back: null,            is_active: 1, created_at: d(1) },
    { name: "Smit Mehta",   phone: "9825099999", role: "Photo editor",    staff_type: "INHOUSE",   payment_type: "MONTHLY", rate_per_day: null, monthly_salary: 28000, with_equipment: 0, equipment_desc: null,       aadhar_number: "823456789012", aadhar_front: null,             aadhar_back: null,            is_active: 1, created_at: d(1) },
    { name: "Arjun Singh",  phone: "9825100001", role: "Audio operator",  staff_type: "EXTERNAL",  payment_type: "PER_DAY", rate_per_day: 1800, monthly_salary: null,  with_equipment: 0, equipment_desc: null,       aadhar_number: "923456789012", aadhar_front: null,             aadhar_back: null,            is_active: 1, created_at: d(1) },
    { name: "Pooja Desai",  phone: "9825100002", role: "Photographer",    staff_type: "EXTERNAL",  payment_type: "PER_DAY", rate_per_day: 2000, monthly_salary: null,  with_equipment: 0, equipment_desc: null,       aadhar_number: "113456789012", aadhar_front: null,             aadhar_back: null,            is_active: 1, created_at: d(1) },
    { name: "Raj Trivedi",  phone: "9825100003", role: "Videographer",    staff_type: "INHOUSE",   payment_type: "MONTHLY", rate_per_day: null, monthly_salary: 40000, with_equipment: 0, equipment_desc: null,       aadhar_number: "213456789012", aadhar_front: null,             aadhar_back: null,            is_active: 0, created_at: d(1) },
  ];

  const staffIds: number[] = [];
  for (const s of staffList) {
    const st = await prisma.staff.create({ data: s });
    staffIds.push(st.id);
  }
  console.log(`     ✓ ${staffIds.length} staff`);

  // ── 10. STAFF ASSIGNMENTS ──────────────────────────────────────────────────
  console.log("  → staff assignments");

  // staffIds index: 0=Rishi, 1=Dev, 2=Mehul, 3=Hetal, 4=Jignesh, 5=Karan, 6=Priya, 7=Nirav, 8=Smit, 9=Arjun, 10=Pooja
  const [rishi, dev, , hetal, jignesh, karan, , nirav, , arjun, pooja] = staffIds;

  // inq-1 (Adani, 3 days) — Rishi on 2 positions (duplicate confirmed)
  const a1 = await prisma.staffAssignment.create({ data: { staff_id: rishi,   inquiry_id: "inq-1", position_no: 1, position_name: "Center Tally",      days_assigned: 3, rate_per_day: 1500, total_amount: 4500,  is_duplicate: 1, confirmed_dup: 1, created_at: d(9) } });
  const a2 = await prisma.staffAssignment.create({ data: { staff_id: rishi,   inquiry_id: "inq-1", position_no: 2, position_name: "Center Semi Wide",   days_assigned: 3, rate_per_day: 1500, total_amount: 4500,  is_duplicate: 1, confirmed_dup: 1, created_at: d(9) } });
  const a3 = await prisma.staffAssignment.create({ data: { staff_id: dev,     inquiry_id: "inq-1", position_no: 3, position_name: "Wireless 1",         days_assigned: 3, rate_per_day: 1500, total_amount: 4500,  is_duplicate: 0, confirmed_dup: 0, created_at: d(9) } });
  const a4 = await prisma.staffAssignment.create({ data: { staff_id: jignesh, inquiry_id: "inq-1", position_no: 4, position_name: "Video Crane 32ft",   days_assigned: 3, rate_per_day: 2500, total_amount: 7500,  is_duplicate: 0, confirmed_dup: 0, created_at: d(9) } });
  const a5 = await prisma.staffAssignment.create({ data: { staff_id: karan,   inquiry_id: "inq-1", position_no: 5, position_name: "Drone",              days_assigned: 3, rate_per_day: 3000, total_amount: 9000,  is_duplicate: 0, confirmed_dup: 0, created_at: d(9) } });
  const a6 = await prisma.staffAssignment.create({ data: { staff_id: pooja,   inquiry_id: "inq-1", position_no: 6, position_name: "Photo 1",            days_assigned: 3, rate_per_day: 2000, total_amount: 6000,  is_duplicate: 0, confirmed_dup: 0, created_at: d(9) } });

  // inq-2 (Torrent, 2 days)
  const a7  = await prisma.staffAssignment.create({ data: { staff_id: rishi,  inquiry_id: "inq-2", position_no: 1, position_name: "Main Camera",        days_assigned: 2, rate_per_day: 1500, total_amount: 3000,  is_duplicate: 0, confirmed_dup: 0, created_at: d(9) } });
  const a8  = await prisma.staffAssignment.create({ data: { staff_id: nirav,  inquiry_id: "inq-2", position_no: 2, position_name: "Backup Camera",      days_assigned: 2, rate_per_day: 1200, total_amount: 2400,  is_duplicate: 0, confirmed_dup: 0, created_at: d(9) } });
  const a9  = await prisma.staffAssignment.create({ data: { staff_id: arjun,  inquiry_id: "inq-2", position_no: 3, position_name: "Audio",              days_assigned: 2, rate_per_day: 1800, total_amount: 3600,  is_duplicate: 0, confirmed_dup: 0, created_at: d(9) } });

  // inq-4 (Dholera Mahotsav, 6 days — previous month)
  const a10 = await prisma.staffAssignment.create({ data: { staff_id: hetal,  inquiry_id: "inq-4", position_no: 1, position_name: "LED operator",       days_assigned: 6, rate_per_day: 1200, total_amount: 7200,  is_duplicate: 0, confirmed_dup: 0, created_at: dp(10) } });
  const a11 = await prisma.staffAssignment.create({ data: { staff_id: jignesh,inquiry_id: "inq-4", position_no: 2, position_name: "Video Crane 32ft",   days_assigned: 6, rate_per_day: 2500, total_amount: 15000, is_duplicate: 0, confirmed_dup: 0, created_at: dp(10) } });
  const a12 = await prisma.staffAssignment.create({ data: { staff_id: karan,  inquiry_id: "inq-4", position_no: 3, position_name: "Drone",              days_assigned: 5, rate_per_day: 3000, total_amount: 15000, is_duplicate: 0, confirmed_dup: 0, created_at: dp(10) } });
  const a13 = await prisma.staffAssignment.create({ data: { staff_id: dev,    inquiry_id: "inq-4", position_no: 4, position_name: "Videographer",       days_assigned: 6, rate_per_day: 1500, total_amount: 9000,  is_duplicate: 0, confirmed_dup: 0, created_at: dp(10) } });

  console.log("     ✓ 13 assignments");

  // ── 11. STAFF PAYMENTS ─────────────────────────────────────────────────────
  console.log("  → staff payments");

  await prisma.staffPayment.createMany({ data: [
    // Rishi — paid for inq-1 Center Tally (a1)
    { staff_id: rishi,   assignment_id: a1.id,  inquiry_id: "inq-1", amount: 4500,  payment_type: "PER_EVENT",      payment_method: "UPI",          reference_no: "UPI123456",    month: null,          paid_at: d(12), paid_by_id: "system", notes: "Center Tally pay" },
    // Dev — paid for inq-1 (a3) and inq-4 (a13)
    { staff_id: dev,     assignment_id: a3.id,  inquiry_id: "inq-1", amount: 4500,  payment_type: "PER_EVENT",      payment_method: "CASH",         reference_no: null,           month: null,          paid_at: d(13), paid_by_id: "system", notes: "Adani Meet pay" },
    { staff_id: dev,     assignment_id: a13.id, inquiry_id: "inq-4", amount: 9000,  payment_type: "PER_EVENT",      payment_method: "CASH",         reference_no: null,           month: null,          paid_at: dp(22), paid_by_id: "system", notes: "Dholera pay" },
    // Jignesh — paid for inq-1 (a4), partial for inq-4 (a11)
    { staff_id: jignesh, assignment_id: a4.id,  inquiry_id: "inq-1", amount: 7500,  payment_type: "PER_EVENT",      payment_method: "BANK_TRANSFER", reference_no: "TXN001",      month: null,          paid_at: d(13), paid_by_id: "system", notes: "Crane pay Adani" },
    { staff_id: jignesh, assignment_id: a11.id, inquiry_id: "inq-4", amount: 10000, payment_type: "PER_EVENT",      payment_method: "BANK_TRANSFER", reference_no: "TXN002",      month: null,          paid_at: dp(22), paid_by_id: "system", notes: "Partial crane pay Dholera" },
    // Karan — partial for inq-4 (a12)
    { staff_id: karan,   assignment_id: a12.id, inquiry_id: "inq-4", amount: 9000,  payment_type: "PER_EVENT",      payment_method: "BANK_TRANSFER", reference_no: "TXN987654",   month: null,          paid_at: dp(22), paid_by_id: "system", notes: "Partial drone pay" },
    // Pooja — paid for inq-1 (a6)
    { staff_id: pooja,   assignment_id: a6.id,  inquiry_id: "inq-1", amount: 6000,  payment_type: "PER_EVENT",      payment_method: "UPI",          reference_no: "UPI999888",    month: null,          paid_at: d(13), paid_by_id: "system", notes: "Photo pay" },
    // Rishi — paid for inq-2 (a7)
    { staff_id: rishi,   assignment_id: a7.id,  inquiry_id: "inq-2", amount: 3000,  payment_type: "PER_EVENT",      payment_method: "UPI",          reference_no: "UPI555444",    month: null,          paid_at: d(16), paid_by_id: "system", notes: "Torrent pay" },
    // Monthly salaries — Priya Joshi (staffIds[6]) and Smit Mehta (staffIds[8])
    { staff_id: staffIds[6], assignment_id: null, inquiry_id: null, amount: 35000, payment_type: "MONTHLY_SALARY", payment_method: "BANK_TRANSFER", reference_no: `SALARY-${y}-${m}-PRIYA`, month: `${y}-${m}`, paid_at: d(1), paid_by_id: "system", notes: "Monthly salary" },
    { staff_id: staffIds[8], assignment_id: null, inquiry_id: null, amount: 28000, payment_type: "MONTHLY_SALARY", payment_method: "BANK_TRANSFER", reference_no: `SALARY-${y}-${m}-SMIT`,  month: `${y}-${m}`, paid_at: d(1), paid_by_id: "system", notes: "Monthly salary" },
    // Mehul Shah (staffIds[2]) — pending (no payment record)
  ]});
  console.log("     ✓ 10 staff payments");

  // ── 12. EQUIPMENT BOOKINGS ─────────────────────────────────────────────────
  console.log("  → equipment bookings");

  // Get equipment IDs we need
  const fx6    = await prisma.equipment.findFirst({ where: { product_name: "Sony FX6" } });
  const fx3    = await prisma.equipment.findFirst({ where: { product_name: "Sony FX3" } });
  const atem   = await prisma.equipment.findFirst({ where: { product_name: "BM ATEM Extreme" } });
  const zoomH6 = await prisma.equipment.findFirst({ where: { product_name: "Zoom H6" } });
  const mars1  = await prisma.equipment.findFirst({ where: { product_name: "Mars 4K-01" } });

  const vendor1 = await prisma.vendor.findFirst({ where: { name: "Apex Rental Services" } });
  const vendor2 = await prisma.vendor.findFirst({ where: { name: "Shreeji Camera Rental" } });

  await prisma.equipmentBooking.createMany({ data: [
    // inq-1 Adani — FX6 kit confirmed OUT
    { inquiry_id: "inq-1", equipment_id: fx6?.id ?? null,  kit_id: kitMap["Sony FX6 Kit"],  position: "Center Tally",     booked_from: d(10), booked_to: d(12), status: "OUT",      vendor_id: null,          vendor_cost_per_day: null,  total_vendor_cost: null,  confirmed_by_id: "system", confirmed_at: d(10) },
    // inq-1 Adani — FX3 kit booked
    { inquiry_id: "inq-1", equipment_id: fx3?.id ?? null,  kit_id: kitMap["Sony FX3 Kit"],  position: "Center Semi Wide", booked_from: d(10), booked_to: d(12), status: "BOOKED",   vendor_id: null,          vendor_cost_per_day: null,  total_vendor_cost: null,  confirmed_by_id: null,     confirmed_at: null  },
    // inq-1 Adani — ATEM Extreme booked
    { inquiry_id: "inq-1", equipment_id: atem?.id ?? null, kit_id: null,                    position: "Video Mixer",      booked_from: d(10), booked_to: d(12), status: "BOOKED",   vendor_id: null,          vendor_cost_per_day: null,  total_vendor_cost: null,  confirmed_by_id: null,     confirmed_at: null  },
    // inq-1 Adani — Crane from vendor (Apex Rental)
    { inquiry_id: "inq-1", equipment_id: null,             kit_id: null,                    position: "Video Crane 32ft", booked_from: d(10), booked_to: d(12), status: "OUT",      vendor_id: vendor1?.id ?? null, vendor_cost_per_day: 8000, total_vendor_cost: 24000, confirmed_by_id: "system", confirmed_at: d(10) },
    // inq-2 Torrent — FX6 kit booked
    { inquiry_id: "inq-2", equipment_id: fx6?.id ?? null,  kit_id: kitMap["Sony FX6 Kit"],  position: "Main Camera",      booked_from: d(14), booked_to: d(15), status: "BOOKED",   vendor_id: null,          vendor_cost_per_day: null,  total_vendor_cost: null,  confirmed_by_id: null,     confirmed_at: null  },
    // inq-2 Torrent — Zoom H6 booked
    { inquiry_id: "inq-2", equipment_id: zoomH6?.id ?? null, kit_id: null,                  position: "Audio",            booked_from: d(14), booked_to: d(15), status: "BOOKED",   vendor_id: null,          vendor_cost_per_day: null,  total_vendor_cost: null,  confirmed_by_id: null,     confirmed_at: null  },
    // inq-2 Torrent — Drone from vendor (Shreeji)
    { inquiry_id: "inq-2", equipment_id: null,             kit_id: null,                    position: "Drone",            booked_from: d(14), booked_to: d(15), status: "BOOKED",   vendor_id: vendor2?.id ?? null, vendor_cost_per_day: 5000, total_vendor_cost: 10000, confirmed_by_id: null,     confirmed_at: null  },
    // inq-4 Dholera — Mars 4K returned
    { inquiry_id: "inq-4", equipment_id: mars1?.id ?? null, kit_id: kitMap["Hollyland Mars 4K Kit-01"], position: "Wireless 1", booked_from: dp(15), booked_to: dp(20), status: "RETURNED", vendor_id: null, vendor_cost_per_day: null, total_vendor_cost: null, confirmed_by_id: "system", confirmed_at: dp(15) },
  ]});
  console.log("     ✓ 8 equipment bookings");

  console.log("\n✅ Seed complete!");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
