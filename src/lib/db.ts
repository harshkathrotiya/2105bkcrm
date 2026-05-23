/**
 * db.ts — SQLite singleton for BK CRM
 *
 * Uses better-sqlite3 (synchronous, no connection pool needed for local use).
 * The DB file lives at <project-root>/bkcrm.db and is created automatically.
 *
 * Import this module only from server-side code (API route handlers, Server
 * Components, Server Actions). Never import it in "use client" files.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// ── DB file path ────────────────────────────────────────────────────────────
const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "bkcrm.db");

// Ensure the data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// ── Singleton ────────────────────────────────────────────────────────────────
// In Next.js dev mode the module is re-evaluated on every hot-reload, so we
// cache the instance on the global object to avoid opening multiple connections.
declare global {
  var __db: Database.Database | undefined;
}

function openDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");   // better concurrent read performance
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000"); // retry up to 5s when busy (parallel builds)
  return db;
}

export const db: Database.Database =
  globalThis.__db ?? (globalThis.__db = openDb());

// ── Schema ───────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id           TEXT PRIMARY KEY,
    initials     TEXT NOT NULL,
    bg           TEXT NOT NULL DEFAULT '#EEEDFE',
    fg           TEXT NOT NULL DEFAULT '#3C3489',
    name         TEXT NOT NULL,
    contact      TEXT NOT NULL,
    mobile       TEXT NOT NULL,
    email        TEXT NOT NULL DEFAULT '',
    gst          TEXT NOT NULL DEFAULT '',
    pan          TEXT NOT NULL DEFAULT '',
    address_line TEXT NOT NULL DEFAULT '',
    city         TEXT NOT NULL DEFAULT '',
    district     TEXT NOT NULL DEFAULT '',
    state        TEXT NOT NULL DEFAULT '',
    pin          TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Inactive')),
    created_at   TEXT NOT NULL,
    updated_at   TEXT
  );

  CREATE TABLE IF NOT EXISTS inquiries (
    id          TEXT PRIMARY KEY,
    client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL,
    start_date  TEXT NOT NULL,
    end_date    TEXT NOT NULL,
    start_time  TEXT NOT NULL DEFAULT '',
    end_time    TEXT NOT NULL DEFAULT '',
    venue       TEXT NOT NULL DEFAULT '',
    notes       TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'New'
                  CHECK(status IN ('New','Quoted','Confirmed','Cancelled')),
    created_at  TEXT NOT NULL,
    updated_at  TEXT
  );

  CREATE TABLE IF NOT EXISTS quotations (
    id           TEXT PRIMARY KEY,
    inquiry_id   TEXT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    client_name  TEXT NOT NULL,
    event_name   TEXT NOT NULL,
    quote_no     TEXT NOT NULL,
    start_date   TEXT NOT NULL,
    end_date     TEXT NOT NULL,
    days         INTEGER NOT NULL DEFAULT 1,
    venue        TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'Draft'
                   CHECK(status IN ('Draft','Sent','Approved','Revised')),
    equipment    TEXT NOT NULL DEFAULT '[]',
    subtotal     REAL NOT NULL DEFAULT 0,
    cgst         REAL NOT NULL DEFAULT 0,
    sgst         REAL NOT NULL DEFAULT 0,
    total        REAL NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL,
    updated_at   TEXT,
    sent_at      TEXT,
    approved_at  TEXT
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id                    TEXT PRIMARY KEY,
    quotation_id          TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    invoice_no            TEXT NOT NULL,
    client_name           TEXT NOT NULL,
    event_name            TEXT NOT NULL,
    start_date            TEXT NOT NULL,
    end_date              TEXT NOT NULL,
    venue                 TEXT NOT NULL DEFAULT '',
    videography_amount    REAL NOT NULL DEFAULT 0,
    photography_amount    REAL NOT NULL DEFAULT 0,
    advance               REAL NOT NULL DEFAULT 0,
    balance               REAL NOT NULL DEFAULT 0,
    status                TEXT NOT NULL DEFAULT 'Unpaid'
                            CHECK(status IN ('Unpaid','Partial paid','Paid')),
    advance_received      INTEGER NOT NULL DEFAULT 0,
    advance_received_at   TEXT,
    advance_ref           TEXT NOT NULL DEFAULT '',
    advance_method        TEXT NOT NULL DEFAULT '',
    balance_received      INTEGER NOT NULL DEFAULT 0,
    balance_received_at   TEXT,
    balance_ref           TEXT NOT NULL DEFAULT '',
    balance_method        TEXT NOT NULL DEFAULT '',
    hdd_delivered         INTEGER NOT NULL DEFAULT 0,
    created_at            TEXT NOT NULL,
    updated_at            TEXT,
    due_date              TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id     TEXT PRIMARY KEY,
    date   INTEGER NOT NULL,
    month  INTEGER NOT NULL,
    year   INTEGER NOT NULL,
    label  TEXT NOT NULL,
    type   TEXT NOT NULL CHECK(type IN ('inquiry','quotation','confirmed','completed'))
  );

  CREATE TABLE IF NOT EXISTS kits (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT UNIQUE NOT NULL,
    description  TEXT,
    main_body_id INTEGER,
    created_at   TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS equipment (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name   TEXT NOT NULL,
    category       TEXT NOT NULL CHECK(category IN ('CAMERA','VIDEO_MIXER','VIDEO_RECORDER','AUDIO_MIXER','WIRELESS_TX','UPS','ACCESSORY')),
    quantity       INTEGER NOT NULL DEFAULT 1,
    serial_number  TEXT,
    body_name      TEXT,
    kit_id         INTEGER REFERENCES kits(id) ON DELETE SET NULL,
    resp_person    TEXT,
    purchase_date  TEXT,
    purchase_from  TEXT,
    bill_number    TEXT,
    purchase_price REAL,
    status         TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE','IN_USE','MAINTENANCE','SOLD','RETIRED')),
    notes          TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT
  );

  CREATE TABLE IF NOT EXISTS vendors (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL,
    phone          TEXT NOT NULL,
    email          TEXT,
    specialization TEXT,
    city           TEXT,
    gst_number     TEXT,
    notes          TEXT,
    is_active      INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0,1)),
    created_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS staff (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    phone           TEXT NOT NULL,
    role            TEXT NOT NULL,
    staff_type      TEXT NOT NULL CHECK(staff_type IN ('INHOUSE', 'EXTERNAL')),
    payment_type    TEXT NOT NULL CHECK(payment_type IN ('PER_DAY', 'MONTHLY')),
    rate_per_day    REAL,
    monthly_salary  REAL,
    with_equipment  INTEGER NOT NULL DEFAULT 0 CHECK(with_equipment IN (0, 1)),
    equipment_desc  TEXT,
    aadhar_number   TEXT,
    aadhar_front    TEXT,
    aadhar_back     TEXT,
    is_active       INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at      TEXT NOT NULL,
    updated_at      TEXT
  );

  CREATE TABLE IF NOT EXISTS staff_assignments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id        INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    inquiry_id      TEXT NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
    position_no     INTEGER,
    position_name   TEXT,
    days_assigned   INTEGER NOT NULL,
    rate_per_day    REAL NOT NULL,
    total_amount    REAL NOT NULL,
    is_duplicate    INTEGER NOT NULL DEFAULT 0 CHECK(is_duplicate IN (0, 1)),
    confirmed_dup   INTEGER NOT NULL DEFAULT 0 CHECK(confirmed_dup IN (0, 1)),
    created_at      TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS staff_payments (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_id        INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    assignment_id   INTEGER REFERENCES staff_assignments(id) ON DELETE SET NULL,
    inquiry_id      TEXT REFERENCES inquiries(id) ON DELETE SET NULL,
    amount          REAL NOT NULL,
    payment_type    TEXT NOT NULL CHECK(payment_type IN ('PER_EVENT', 'MONTHLY_SALARY')),
    payment_method  TEXT NOT NULL CHECK(payment_method IN ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE')),
    reference_no    TEXT,
    month           TEXT, -- "YYYY-MM"
    paid_at         TEXT NOT NULL,
    paid_by_id      TEXT,
    notes           TEXT
  );
`);

// ── Seed ─────────────────────────────────────────────────────────────────────
// NOTE: This runs at module import time. During `next build`, Turbopack can
// load this module in up to 7 parallel workers (separate processes, each with
// its own globalThis). The seed is wrapped in try-catch to handle the race
// where two workers try to insert seed data simultaneously.
function runSeed(): void {
  const clientCount = (
    db.prepare("SELECT COUNT(*) as n FROM clients").get() as { n: number }
  ).n;

  if (clientCount !== 0) return;

  const insertClient = db.prepare(`
    INSERT INTO clients
      (id,initials,bg,fg,name,contact,mobile,email,gst,pan,
       address_line,city,district,state,pin,status,created_at,updated_at)
    VALUES
      (@id,@initials,@bg,@fg,@name,@contact,@mobile,@email,@gst,@pan,
       @addressLine,@city,@district,@state,@pin,@status,@createdAt,@updatedAt)
  `);

  const insertInquiry = db.prepare(`
    INSERT INTO inquiries
      (id,client_id,event_type,start_date,end_date,start_time,end_time,
       venue,notes,status,created_at,updated_at)
    VALUES
      (@id,@clientId,@eventType,@startDate,@endDate,@startTime,@endTime,
       @venue,@notes,@status,@createdAt,@updatedAt)
  `);

  const insertQuotation = db.prepare(`
    INSERT INTO quotations
      (id,inquiry_id,client_name,event_name,quote_no,start_date,end_date,
       days,venue,status,equipment,subtotal,cgst,sgst,total,
       created_at,updated_at,sent_at,approved_at)
    VALUES
      (@id,@inquiryId,@clientName,@eventName,@quoteNo,@startDate,@endDate,
       @days,@venue,@status,@equipment,@subtotal,@cgst,@sgst,@total,
       @createdAt,@updatedAt,@sentAt,@approvedAt)
  `);

  const insertInvoice = db.prepare(`
    INSERT INTO invoices
      (id,quotation_id,invoice_no,client_name,event_name,start_date,end_date,
       venue,videography_amount,photography_amount,advance,balance,status,
       advance_received,advance_received_at,advance_ref,advance_method,
       balance_received,balance_received_at,balance_ref,balance_method,
       hdd_delivered,created_at,updated_at,due_date)
    VALUES
      (@id,@quotationId,@invoiceNo,@clientName,@eventName,@startDate,@endDate,
       @venue,@videographyAmount,@photographyAmount,@advance,@balance,@status,
       @advanceReceived,@advanceReceivedAt,@advanceRef,@advanceMethod,
       @balanceReceived,@balanceReceivedAt,@balanceRef,@balanceMethod,
       @hddDelivered,@createdAt,@updatedAt,@dueDate)
  `);

  const insertCalEvent = db.prepare(`
    INSERT INTO calendar_events (id,date,month,year,label,type)
    VALUES (@id,@date,@month,@year,@label,@type)
  `);

  const seedEquipment = [
    { no: 1, position: "Center Tally",        equip: "FS6",            rate: 20000, days: 3, amount: 60000 },
    { no: 2, position: "Center Semi Wide",     equip: "FS6",            rate: 20000, days: 3, amount: 60000 },
    { no: 3, position: "Wireless 1",           equip: "FX3 + Wireless", rate: 10000, days: 3, amount: 30000 },
    { no: 4, position: "Photo 1",              equip: "DSLR",           rate:  8000, days: 3, amount: 24000 },
    { no: 5, position: "Video Crane 32 Feet",  equip: "Crane 32 Feet",  rate: 15000, days: 3, amount: 45000 },
  ];
  const seedSubtotal = seedEquipment.reduce((s, r) => s + r.amount, 0);
  const seedTax = Math.round(seedSubtotal * 0.09);

  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  const d = (day: number) => `${y}-${m}-${String(day).padStart(2, "0")}`;
  const month = now.getMonth() + 1; // 1-indexed for calendar
  const year = now.getFullYear();

  const seed = db.transaction(() => {
    insertClient.run({ id: "client-1", initials: "AG", bg: "#EEEDFE", fg: "#3C3489", name: "Adani Group",    contact: "Vikram Shah",  mobile: "9825011111", email: "vikram@adani.com",          gst: "24AAACA1234R1ZX", pan: "AAACA1234R", addressLine: "Shantipura, SG Highway", city: "Ahmedabad",  district: "Ahmedabad",  state: "Gujarat", pin: "380015", status: "Active",   createdAt: d(1), updatedAt: null });
    insertClient.run({ id: "client-2", initials: "TP", bg: "#E1F5EE", fg: "#085041", name: "Torrent Pharma", contact: "Priya Mehta",  mobile: "9825022222", email: "priya@torrentpharma.com",   gst: "24BBBBB5678R1ZX", pan: "BBBBB5678R", addressLine: "Ashram Road",            city: "Ahmedabad",  district: "Ahmedabad",  state: "Gujarat", pin: "380009", status: "Active",   createdAt: d(2), updatedAt: null });
    insertClient.run({ id: "client-3", initials: "PF", bg: "#FAECE7", fg: "#712B13", name: "Patel Family",   contact: "Rajesh Patel", mobile: "9825033333", email: "rajesh@email.com",           gst: "",                pan: "",           addressLine: "Gorwa",                  city: "Vadodara",   district: "Vadodara",   state: "Gujarat", pin: "390016", status: "Active",   createdAt: d(3), updatedAt: null });
    insertClient.run({ id: "client-4", initials: "DT", bg: "#E6F1FB", fg: "#0C447C", name: "Dholera Trust",  contact: "Swami Mahraj", mobile: "9825044444", email: "swami@dholeratrust.org",     gst: "24CCCCC9012R1ZX", pan: "CCCCC9012R", addressLine: "Dholera",                city: "Dholera",    district: "Ahmedabad",  state: "Gujarat", pin: "382455", status: "Active",   createdAt: d(4), updatedAt: null });
    insertClient.run({ id: "client-5", initials: "GC", bg: "#FAEEDA", fg: "#633806", name: "GIFT City Corp", contact: "Amit Kumar",   mobile: "9825055555", email: "amit@giftcity.in",           gst: "",                pan: "",           addressLine: "GIFT City",              city: "Gandhinagar", district: "Gandhinagar", state: "Gujarat", pin: "382355", status: "Inactive", createdAt: d(5), updatedAt: null });

    insertInquiry.run({ id: "inq-1", clientId: "client-1", eventType: "Corporate event", startDate: d(10), endDate: d(12), startTime: "09:00 AM", endTime: "09:00 PM", venue: "Grand Bhagwati, Ahmedabad", notes: "Annual conference with product launch", status: "Quoted",    createdAt: d(9), updatedAt: null });
    insertInquiry.run({ id: "inq-2", clientId: "client-2", eventType: "Product launch",  startDate: d(14), endDate: d(15), startTime: "04:00 PM", endTime: "10:00 PM", venue: "Torrent House, Ahmedabad",  notes: "",                                    status: "Quoted",    createdAt: d(9), updatedAt: null });
    insertInquiry.run({ id: "inq-3", clientId: "client-3", eventType: "Wedding",         startDate: d(21), endDate: d(22), startTime: "06:00 AM", endTime: "11:00 PM", venue: "Patel Farm, Vadodara",      notes: "Full day coverage needed",            status: "New",       createdAt: d(10), updatedAt: null });

    insertQuotation.run({
      id: "quote-1", inquiryId: "inq-1", clientName: "Adani Group",
      eventName: "Annual Conference", quoteNo: `BKM/${y}/${m}/01`,
      startDate: d(10), endDate: d(12), days: 3,
      venue: "Grand Bhagwati, Ahmedabad", status: "Draft",
      equipment: JSON.stringify(seedEquipment),
      subtotal: seedSubtotal, cgst: seedTax, sgst: seedTax,
      total: seedSubtotal + seedTax * 2,
      createdAt: d(9), updatedAt: null, sentAt: null, approvedAt: null,
    });

    insertInvoice.run({
      id: "inv-1", quotationId: "quote-1", invoiceNo: `BKM-INV-${y}/${m}/01`,
      clientName: "Adani Group", eventName: "Annual Conference",
      startDate: d(10), endDate: d(12),
      venue: "Grand Bhagwati, Ahmedabad",
      videographyAmount: 180000, photographyAmount: 39000,
      advance: 129210, balance: 129210, status: "Partial paid",
      advanceReceived: 1, advanceReceivedAt: d(11),
      advanceRef: "UPI123456", advanceMethod: "UPI",
      balanceReceived: 0, balanceReceivedAt: null,
      balanceRef: "", balanceMethod: "",
      hddDelivered: 0, createdAt: d(13), updatedAt: null, dueDate: d(20),
    });

    const calEvents = [
      { id: "cal-1", date: 10, month, year, label: "Adani Meet",     type: "confirmed" },
      { id: "cal-2", date: 11, month, year, label: "\u2194 Adani",        type: "confirmed" },
      { id: "cal-3", date: 12, month, year, label: "\u2194 Adani",        type: "confirmed" },
      { id: "cal-4", date: 14, month, year, label: "Torrent Launch",  type: "quotation" },
      { id: "cal-5", date: 15, month, year, label: "\u2194 Torrent",      type: "quotation" },
      { id: "cal-6", date: 21, month, year, label: "Patel Wedding",   type: "inquiry"   },
      { id: "cal-7", date: 22, month, year, label: "\u2194 Patel",        type: "inquiry"   },
    ];
    for (const e of calEvents) insertCalEvent.run(e);
  });

  seed();
}

function runPhase2Seed(): void {
  // Check if equipment is already seeded
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='equipment'").get();
  if (!tableCheck) return;

  const equipCount = (
    db.prepare("SELECT COUNT(*) as n FROM equipment").get() as { n: number }
  ).n;

  if (equipCount > 0) return;

  db.transaction(() => {
    // 1. Insert Vendors
    const insertVendor = db.prepare(`
      INSERT INTO vendors (name, phone, email, specialization, city, gst_number, notes, is_active, created_at)
      VALUES (@name, @phone, @email, @specialization, @city, @gstNumber, @notes, 1, datetime('now'))
    `);
    
    insertVendor.run({ name: "Apex Rental Services", phone: "9925012345", email: "info@apexrentals.com", specialization: "Crane, Heavy Equipment", city: "Ahmedabad", gstNumber: "24APEXR1234R1ZX", notes: "Prefers payments via bank transfer." });
    insertVendor.run({ name: "Shreeji Camera Rental", phone: "9876543210", email: "rent@shreejicamera.com", specialization: "Drone, Camera, Lenses", city: "Vadodara", gstNumber: null, notes: "Contact person: Jignesh Bhai." });
    insertVendor.run({ name: "Falcon Drones & FPV", phone: "9123456789", email: "fly@falcondrones.com", specialization: "Drone, FPV", city: "Ahmedabad", gstNumber: "24FALCON9876A1Z", notes: "Requires 1 day advance booking." });
    insertVendor.run({ name: "Audio Masters Rental", phone: "9898098980", email: "audio@masters.com", specialization: "Audio Mixer, Microphones", city: "Gandhinagar", gstNumber: null, notes: "High quality wireless mics available." });
    insertVendor.run({ name: "Vasu Video Solutions", phone: "9090990909", email: "vasuvideo@gmail.com", specialization: "Video Mixer, Switchers", city: "Ahmedabad", gstNumber: null, notes: "Reliable production switcher rent." });

    // 2. Insert Kits placeholder (to get IDs)
    const insertKit = db.prepare(`
      INSERT INTO kits (name, description, created_at)
      VALUES (@name, @description, datetime('now'))
    `);

    const kitNames = [
      "Sony FX6 Kit", "Sony FX3 Kit", "Sony Alpha 7S III Kit", "Sony Alpha 7 IV Kit",
      "Sony ILCE 7M5 Kit", "Z150-01 Kit", "Z150-02 Kit", "Z150-03 Kit", "Z150-05 Kit",
      "Hollyland Mars 4K Kit-01", "Hollyland Mars 4K Kit-02", "Hollyland Mars 4K Kit-03",
      "Accsoon Master 4K Kit", "Live-U Solo HD Kit", "Eartec Talkback Kit", "Tally System Kit"
    ];
    
    const kitIds: Record<string, number> = {};
    for (const name of kitNames) {
      const res = insertKit.run({ name, description: `BK Media standard ${name}.` });
      kitIds[name] = res.lastInsertRowid as number;
    }

    // 3. Insert Equipment
    const insertEquip = db.prepare(`
      INSERT INTO equipment (product_name, category, quantity, serial_number, body_name, kit_id, resp_person, purchase_price, status, created_at)
      VALUES (@productName, @category, @quantity, @serialNumber, @bodyName, @kitId, @respPerson, @purchasePrice, 'AVAILABLE', datetime('now'))
    `);

    // Insert 10 Cameras
    const cameras = [
      { productName: "Sony FX6", category: "CAMERA", quantity: 1, serialNumber: "7000701", bodyName: "Sony FX6", kitId: kitIds["Sony FX6 Kit"], respPerson: "Vikram", purchasePrice: 450000 },
      { productName: "Sony FX3", category: "CAMERA", quantity: 1, serialNumber: "1002576", bodyName: "Sony FX3", kitId: kitIds["Sony FX3 Kit"], respPerson: "Priya", purchasePrice: 340000 },
      { productName: "Sony Alpha 7S III", category: "CAMERA", quantity: 1, serialNumber: "5781062", bodyName: "Sony Alpha 7S III", kitId: kitIds["Sony Alpha 7S III Kit"], respPerson: "Rohan", purchasePrice: 250000 },
      { productName: "Sony Alpha 7 IV", category: "CAMERA", quantity: 1, serialNumber: "8468677", bodyName: "Sony Alpha 7 IV", kitId: kitIds["Sony Alpha 7 IV Kit"], respPerson: "Rahul", purchasePrice: 200000 },
      { productName: "Sony ILCE 7M5", category: "CAMERA", quantity: 1, serialNumber: "2027594", bodyName: "Sony ILCE 7M5", kitId: kitIds["Sony ILCE 7M5 Kit"], respPerson: "Manish", purchasePrice: 194915 },
      { productName: "Sony Z150-01", category: "CAMERA", quantity: 1, serialNumber: "7003244", bodyName: "Sony Z150-01", kitId: kitIds["Z150-01 Kit"], respPerson: "Sanjay", purchasePrice: 285000 },
      { productName: "Sony Z150-02", category: "CAMERA", quantity: 1, serialNumber: "7003683", bodyName: "Sony Z150-02", kitId: kitIds["Z150-02 Kit"], respPerson: "Jayesh", purchasePrice: 285000 },
      { productName: "Sony Z150-03", category: "CAMERA", quantity: 1, serialNumber: "7001810", bodyName: "Sony Z150-03", kitId: kitIds["Z150-03 Kit"], respPerson: "Sanjay", purchasePrice: 285000 },
      { productName: "Sony Z150-05", category: "CAMERA", quantity: 1, serialNumber: "7004593", bodyName: "Sony Z150-05", kitId: kitIds["Z150-05 Kit"], respPerson: "Jayesh", purchasePrice: 285000 },
      { productName: "Sony Z150-04", category: "CAMERA", quantity: 1, serialNumber: "7004123", bodyName: "Sony Z150-04", kitId: null, respPerson: "Sanjay", purchasePrice: 285000 },
    ];
    
    for (const cam of cameras) {
      const res = insertEquip.run({ ...cam });
      const id = res.lastInsertRowid as number;
      if (cam.kitId) {
        db.prepare("UPDATE kits SET main_body_id = ? WHERE id = ?").run(id, cam.kitId);
      }
    }

    // Insert 9 Video Mixers
    const videoMixers = [
      { productName: "BM Videohub 20x20 12G", category: "VIDEO_MIXER", quantity: 1, serialNumber: "VH-2020-01", bodyName: null, kitId: null, respPerson: "Amit", purchasePrice: 247800 },
      { productName: "Stream Deck 01", category: "VIDEO_MIXER", quantity: 1, serialNumber: "SD-01", bodyName: null, kitId: null, respPerson: "Vikram", purchasePrice: 21590 },
      { productName: "Stream Deck 02", category: "VIDEO_MIXER", quantity: 1, serialNumber: "SD-02", bodyName: null, kitId: null, respPerson: "Vikram", purchasePrice: 21590 },
      { productName: "BM ATEM Mini", category: "VIDEO_MIXER", quantity: 1, serialNumber: "AM-01", bodyName: null, kitId: null, respPerson: "Amit", purchasePrice: 30000 },
      { productName: "BM ATEM Extreme", category: "VIDEO_MIXER", quantity: 1, serialNumber: "AE-01", bodyName: null, kitId: null, respPerson: "Amit", purchasePrice: 80000 },
      { productName: "Roland V-1HD Mixer", category: "VIDEO_MIXER", quantity: 1, serialNumber: "RM-01", bodyName: null, kitId: null, respPerson: "Amit", purchasePrice: 75000 },
      { productName: "Feelworld Live Mixer", category: "VIDEO_MIXER", quantity: 1, serialNumber: "FM-01", bodyName: null, kitId: null, respPerson: "Vikram", purchasePrice: 45000 },
      { productName: "DevMixer 4K", category: "VIDEO_MIXER", quantity: 1, serialNumber: "DM-01", bodyName: null, kitId: null, respPerson: "Manish", purchasePrice: 120000 },
      { productName: "VMixer Test", category: "VIDEO_MIXER", quantity: 1, serialNumber: null, bodyName: null, kitId: null, respPerson: null, purchasePrice: null },
    ];
    for (const mx of videoMixers) {
      insertEquip.run({ ...mx });
    }

    // Insert 7 Video Recorders
    const videoRecorders = [
      { productName: "Atomos Shogun 7", category: "VIDEO_RECORDER", quantity: 1, serialNumber: "AS-01", bodyName: null, kitId: null, respPerson: "Rohan", purchasePrice: 110000 },
      { productName: "Atomos Ninja V", category: "VIDEO_RECORDER", quantity: 1, serialNumber: "AN-01", bodyName: null, kitId: null, respPerson: "Rohan", purchasePrice: 65000 },
      { productName: "Blackmagic HyperDeck Studio", category: "VIDEO_RECORDER", quantity: 1, serialNumber: "HS-01", bodyName: null, kitId: null, respPerson: "Amit", purchasePrice: 95000 },
      { productName: "Blackmagic Video Assist 7\"", category: "VIDEO_RECORDER", quantity: 1, serialNumber: "VA-07", bodyName: null, kitId: null, respPerson: "Amit", purchasePrice: 85000 },
      { productName: "Blackmagic Video Assist 5\"", category: "VIDEO_RECORDER", quantity: 1, serialNumber: "VA-05", bodyName: null, kitId: null, respPerson: "Vikram", purchasePrice: 55000 },
      { productName: "Blackmagic HyperDeck Shuttle", category: "VIDEO_RECORDER", quantity: 1, serialNumber: "HS-02", bodyName: null, kitId: null, respPerson: "Manish", purchasePrice: 35000 },
      { productName: "Video Recorder Test", category: "VIDEO_RECORDER", quantity: 1, serialNumber: null, bodyName: null, kitId: null, respPerson: null, purchasePrice: null },
    ];
    for (const rec of videoRecorders) {
      insertEquip.run({ ...rec });
    }

    // Insert 4 Audio Mixers
    const audioMixers = [
      { productName: "Zoom H6", category: "AUDIO_MIXER", quantity: 1, serialNumber: "ZH-01", bodyName: null, kitId: null, respPerson: "Vikram", purchasePrice: 32000 },
      { productName: "Rodecaster Pro II", category: "AUDIO_MIXER", quantity: 1, serialNumber: "RP-01", bodyName: null, kitId: null, respPerson: "Vikram", purchasePrice: 65000 },
      { productName: "Yamaha MG10XU", category: "AUDIO_MIXER", quantity: 1, serialNumber: "YM-01", bodyName: null, kitId: null, respPerson: "Vikram", purchasePrice: 20000 },
      { productName: "Zoom F8n Pro", category: "AUDIO_MIXER", quantity: 1, serialNumber: "ZF-01", bodyName: null, kitId: null, respPerson: "Manish", purchasePrice: 95000 },
    ];
    for (const am of audioMixers) {
      insertEquip.run({ ...am });
    }

    // Insert 7 Wireless TX
    const wirelessTX = [
      { productName: "Mars 4K-01", category: "WIRELESS_TX", quantity: 1, serialNumber: "0023050T-R", bodyName: "Mars 4K-01", kitId: kitIds["Hollyland Mars 4K Kit-01"], respPerson: "Rahul", purchasePrice: 45000 },
      { productName: "Mars 4K-02", category: "WIRELESS_TX", quantity: 1, serialNumber: "0023470T-R", bodyName: "Mars 4K-02", kitId: kitIds["Hollyland Mars 4K Kit-02"], respPerson: "Rahul", purchasePrice: 45000 },
      { productName: "Mars 4K-03", category: "WIRELESS_TX", quantity: 1, serialNumber: "0023470T-R", bodyName: "Mars 4K-03", kitId: kitIds["Hollyland Mars 4K Kit-03"], respPerson: "Rahul", purchasePrice: 45000 },
      { productName: "Accsoon Master 4K", category: "WIRELESS_TX", quantity: 1, serialNumber: "WIT07-0905", bodyName: "Accsoon Master 4K", kitId: kitIds["Accsoon Master 4K Kit"], respPerson: "Manish", purchasePrice: 38000 },
      { productName: "Live-U Solo HD", category: "WIRELESS_TX", quantity: 1, serialNumber: "202120-23099", bodyName: "Live-U Solo HD", kitId: kitIds["Live-U Solo HD Kit"], respPerson: "Amit", purchasePrice: 150000 },
      { productName: "Hollyland Cosmo C1", category: "WIRELESS_TX", quantity: 1, serialNumber: "CC-01", bodyName: null, kitId: null, respPerson: "Vikram", purchasePrice: 75000 },
      { productName: "Teradek Bolt 4K", category: "WIRELESS_TX", quantity: 1, serialNumber: "TB-01", bodyName: null, kitId: null, respPerson: "Vikram", purchasePrice: 220000 },
    ];
    for (const wtx of wirelessTX) {
      const res = insertEquip.run({ ...wtx });
      const id = res.lastInsertRowid as number;
      if (wtx.kitId) {
        db.prepare("UPDATE kits SET main_body_id = ? WHERE id = ?").run(id, wtx.kitId);
      }
    }

    // Insert 3 UPS
    const ups = [
      { productName: "APC Easy UPS 1KVA", category: "UPS", quantity: 1, serialNumber: "UP-01", bodyName: null, kitId: null, respPerson: "Vikram", purchasePrice: 12000 },
      { productName: "APC Easy UPS 2KVA", category: "UPS", quantity: 1, serialNumber: "UP-02", bodyName: null, kitId: null, respPerson: "Vikram", purchasePrice: 22000 },
      { productName: "Microtek UPS 1KVA", category: "UPS", quantity: 1, serialNumber: "UP-03", bodyName: null, kitId: null, respPerson: "Vikram", purchasePrice: 8000 },
    ];
    for (const u of ups) {
      insertEquip.run({ ...u });
    }

    // Insert 183 Accessories
    const specificAccessories = [
      { productName: "Sony 200-600mm G 01", category: "ACCESSORY", quantity: 1, serialNumber: "1938001", purchasePrice: 150000 },
      { productName: "Sony 200-600mm G 02", category: "ACCESSORY", quantity: 1, serialNumber: "1916007", purchasePrice: 150000 },
      { productName: "Sony 400-800mm G", category: "ACCESSORY", quantity: 1, serialNumber: "1814652", purchasePrice: 270000 },
      
      { productName: "Sony Charger", category: "ACCESSORY", quantity: 1, serialNumber: "3374091", purchasePrice: 13000, kitName: "Sony FX6 Kit" },
      { productName: "Lexar Card 160GB (FX6 #1)", category: "ACCESSORY", quantity: 1, serialNumber: "LC-160-01", purchasePrice: 12000, kitName: "Sony FX6 Kit" },
      { productName: "Lexar Card 160GB (FX6 #2)", category: "ACCESSORY", quantity: 1, serialNumber: "LC-160-02", purchasePrice: 12000, kitName: "Sony FX6 Kit" },
      { productName: "Sony BP-U35", category: "ACCESSORY", quantity: 1, serialNumber: "BP-35-01", purchasePrice: 15000, kitName: "Sony FX6 Kit" },
      { productName: "Welborn (FX6)", category: "ACCESSORY", quantity: 1, serialNumber: "WB-01", purchasePrice: 1000, kitName: "Sony FX6 Kit" },
      { productName: "Lexar Type A Card", category: "ACCESSORY", quantity: 1, serialNumber: "LTA-01", purchasePrice: 18000, kitName: "Sony FX6 Kit" },
      { productName: "Digitek (FX6)", category: "ACCESSORY", quantity: 1, serialNumber: "DT-01", purchasePrice: 900, kitName: "Sony FX6 Kit" },

      { productName: "Lexar Card 160GB (FX3 #1)", category: "ACCESSORY", quantity: 1, serialNumber: "LC-160-03", purchasePrice: 12000, kitName: "Sony FX3 Kit" },
      { productName: "Lexar Card 160GB (FX3 #2)", category: "ACCESSORY", quantity: 1, serialNumber: "LC-160-04", purchasePrice: 12000, kitName: "Sony FX3 Kit" },
      { productName: "Sony NP-FZ100 (FX3 #1)", category: "ACCESSORY", quantity: 1, serialNumber: "FZ-01", purchasePrice: 6000, kitName: "Sony FX3 Kit" },
      { productName: "Sony NP-FZ100 (FX3 #2)", category: "ACCESSORY", quantity: 1, serialNumber: "FZ-02", purchasePrice: 6000, kitName: "Sony FX3 Kit" },
      { productName: "Sony NP-FZ100 (FX3 #3)", category: "ACCESSORY", quantity: 1, serialNumber: "FZ-03", purchasePrice: 6000, kitName: "Sony FX3 Kit" },
      { productName: "Sony Charger (FX3)", category: "ACCESSORY", quantity: 1, serialNumber: "SC-02", purchasePrice: 13000, kitName: "Sony FX3 Kit" },
      { productName: "Digitek (FX3)", category: "ACCESSORY", quantity: 1, serialNumber: "DT-02", purchasePrice: 900, kitName: "Sony FX3 Kit" },

      { productName: "Lexar 900mbps Card #1", category: "ACCESSORY", quantity: 1, serialNumber: "L9-01", purchasePrice: 10000, kitName: "Sony Alpha 7S III Kit" },
      { productName: "Lexar 900mbps Card #2", category: "ACCESSORY", quantity: 1, serialNumber: "L9-02", purchasePrice: 10000, kitName: "Sony Alpha 7S III Kit" },
      { productName: "Sony NP-FZ100 (7S #1)", category: "ACCESSORY", quantity: 1, serialNumber: "FZ-04", purchasePrice: 6000, kitName: "Sony Alpha 7S III Kit" },
      { productName: "Sony NP-FZ100 (7S #2)", category: "ACCESSORY", quantity: 1, serialNumber: "FZ-05", purchasePrice: 6000, kitName: "Sony Alpha 7S III Kit" },
      { productName: "Sony NP-FZ100 (7S #3)", category: "ACCESSORY", quantity: 1, serialNumber: "FZ-06", purchasePrice: 6000, kitName: "Sony Alpha 7S III Kit" },
      { productName: "BC-QZ1 Charger (7S)", category: "ACCESSORY", quantity: 1, serialNumber: "BC-01", purchasePrice: 8000, kitName: "Sony Alpha 7S III Kit" },
      { productName: "24-70mm 2.8 GM Lens", category: "ACCESSORY", quantity: 1, serialNumber: "GM-2470", purchasePrice: 180000, kitName: "Sony Alpha 7S III Kit" },
      { productName: "Sony 16-35mm Z Lens (7S)", category: "ACCESSORY", quantity: 1, serialNumber: "1635Z-01", purchasePrice: 66102, kitName: "Sony Alpha 7S III Kit" },
      { productName: "Sigma 35mm Lens", category: "ACCESSORY", quantity: 1, serialNumber: "SG-35", purchasePrice: 65000, kitName: "Sony Alpha 7S III Kit" },
      { productName: "50mm 1.8 Lens", category: "ACCESSORY", quantity: 1, serialNumber: "S50", purchasePrice: 18000, kitName: "Sony Alpha 7S III Kit" },
      { productName: "70-200mm 2.8 Lens", category: "ACCESSORY", quantity: 1, serialNumber: "S70200", purchasePrice: 220000, kitName: "Sony Alpha 7S III Kit" },
      { productName: "Digitek LED Panel (7S)", category: "ACCESSORY", quantity: 1, serialNumber: "DL-01", purchasePrice: 8000, kitName: "Sony Alpha 7S III Kit" },

      { productName: "24-105mm G Lens", category: "ACCESSORY", quantity: 1, serialNumber: "G24105", purchasePrice: 90000, kitName: "Sony Alpha 7 IV Kit" },
      { productName: "85mm 1.8 Lens", category: "ACCESSORY", quantity: 1, serialNumber: "S85", purchasePrice: 42000, kitName: "Sony Alpha 7 IV Kit" },
      { productName: "GODOX V860 Flash", category: "ACCESSORY", quantity: 1, serialNumber: "GX-860", purchasePrice: 15000, kitName: "Sony Alpha 7 IV Kit" },
      { productName: "Sony NP-FZ100 (7IV #1)", category: "ACCESSORY", quantity: 1, serialNumber: "FZ-07", purchasePrice: 6000, kitName: "Sony Alpha 7 IV Kit" },
      { productName: "Sony NP-FZ100 (7IV #2)", category: "ACCESSORY", quantity: 1, serialNumber: "FZ-08", purchasePrice: 6000, kitName: "Sony Alpha 7 IV Kit" },
      { productName: "BC-QZ1 Charger (7IV)", category: "ACCESSORY", quantity: 1, serialNumber: "BC-02", purchasePrice: 8000, kitName: "Sony Alpha 7 IV Kit" },
      { productName: "GODOX VB26 Battery #1", category: "ACCESSORY", quantity: 1, serialNumber: "VB26-01", purchasePrice: 3000, kitName: "Sony Alpha 7 IV Kit" },
      { productName: "GODOX VB26 Battery #2", category: "ACCESSORY", quantity: 1, serialNumber: "VB26-02", purchasePrice: 3000, kitName: "Sony Alpha 7 IV Kit" },
      { productName: "GODOX VB26 Battery #3", category: "ACCESSORY", quantity: 1, serialNumber: "VB26-03", purchasePrice: 3000, kitName: "Sony Alpha 7 IV Kit" },
      { productName: "GODOX VC26 Charger", category: "ACCESSORY", quantity: 1, serialNumber: "VC26-01", purchasePrice: 2000, kitName: "Sony Alpha 7 IV Kit" },

      { productName: "Charger+Battery kit (7M5)", category: "ACCESSORY", quantity: 1, serialNumber: "CB-7M5", purchasePrice: 20678, kitName: "Sony ILCE 7M5 Kit" },
      { productName: "Lexar 320GB CF-A", category: "ACCESSORY", quantity: 1, serialNumber: "L320-01", purchasePrice: 30508, kitName: "Sony ILCE 7M5 Kit" },
      { productName: "Sony 24-240mm Lens", category: "ACCESSORY", quantity: 1, serialNumber: "24240-01", purchasePrice: 61017, kitName: "Sony ILCE 7M5 Kit" },
      { productName: "Sony 16-35mm Z Lens (7M5)", category: "ACCESSORY", quantity: 1, serialNumber: "1635Z-02", purchasePrice: 66102, kitName: "Sony ILCE 7M5 Kit" },
      { productName: "Godox V860 III Flash Kit", category: "ACCESSORY", quantity: 1, serialNumber: "GX3-01", purchasePrice: 12712, kitName: "Sony ILCE 7M5 Kit" },

      { productName: "Lexar 64GB (Z150-01)", category: "ACCESSORY", quantity: 1, serialNumber: "L64-01", purchasePrice: 3000, kitName: "Z150-01 Kit" },
      { productName: "Sony NP-F770 (Z150-01)", category: "ACCESSORY", quantity: 1, serialNumber: "41163929", purchasePrice: 2000, kitName: "Z150-01 Kit" },
      { productName: "Welborn (Z150-01)", category: "ACCESSORY", quantity: 1, serialNumber: "41154610", purchasePrice: 1000, kitName: "Z150-01 Kit" },
      { productName: "BC-L1 Charger (Z150-01)", category: "ACCESSORY", quantity: 1, serialNumber: "BC-L1-01", purchasePrice: 8000, kitName: "Z150-01 Kit" },

      { productName: "Lexar 64GB (Z150-02)", category: "ACCESSORY", quantity: 1, serialNumber: "L64-02", purchasePrice: 3000, kitName: "Z150-02 Kit" },
      { productName: "Sony NP-F770 (Z150-02)", category: "ACCESSORY", quantity: 1, serialNumber: "F770-02", purchasePrice: 2000, kitName: "Z150-02 Kit" },
      { productName: "DigiTek NP-F950 Battery", category: "ACCESSORY", quantity: 1, serialNumber: "DT950-01", purchasePrice: 3000, kitName: "Z150-02 Kit" },
      { productName: "DigiTek BC-L1 Charger", category: "ACCESSORY", quantity: 1, serialNumber: "DBC-01", purchasePrice: 4000, kitName: "Z150-02 Kit" },

      { productName: "Lexar 64GB (Z150-03)", category: "ACCESSORY", quantity: 1, serialNumber: "L64-03", purchasePrice: 3000, kitName: "Z150-03 Kit" },
      { productName: "Sony NP-F770 (Z150-03)", category: "ACCESSORY", quantity: 1, serialNumber: "F770-03", purchasePrice: 2000, kitName: "Z150-03 Kit" },
      { productName: "Welborn (Z150-03)", category: "ACCESSORY", quantity: 1, serialNumber: "WB-03", purchasePrice: 1000, kitName: "Z150-03 Kit" },
      { productName: "BC-L1 Charger (Z150-03)", category: "ACCESSORY", quantity: 1, serialNumber: "BC-L1-03", purchasePrice: 8000, kitName: "Z150-03 Kit" },

      { productName: "Lexar 64GB (Z150-05)", category: "ACCESSORY", quantity: 1, serialNumber: "L64-04", purchasePrice: 3000, kitName: "Z150-05 Kit" },
      { productName: "Sony NP-F770 (Z150-05)", category: "ACCESSORY", quantity: 1, serialNumber: "F770-04", purchasePrice: 2000, kitName: "Z150-05 Kit" },
      { productName: "Osaka Battery", category: "ACCESSORY", quantity: 1, serialNumber: "OB-01", purchasePrice: 2000, kitName: "Z150-05 Kit" },
      { productName: "BC-L1 Charger (Z150-05)", category: "ACCESSORY", quantity: 1, serialNumber: "BC-L1-04", purchasePrice: 8000, kitName: "Z150-05 Kit" },

      { productName: "Digitek (Mars1 #1)", category: "ACCESSORY", quantity: 1, serialNumber: "DT-03", purchasePrice: 900, kitName: "Hollyland Mars 4K Kit-01" },
      { productName: "Digitek (Mars1 #2)", category: "ACCESSORY", quantity: 1, serialNumber: "DT-04", purchasePrice: 900, kitName: "Hollyland Mars 4K Kit-01" },
      { productName: "Digitek (Mars1 #3)", category: "ACCESSORY", quantity: 1, serialNumber: "DT-05", purchasePrice: 900, kitName: "Hollyland Mars 4K Kit-01" },
      { productName: "TYFY Battery (Mars1)", category: "ACCESSORY", quantity: 1, serialNumber: "TF-01", purchasePrice: 1500, kitName: "Hollyland Mars 4K Kit-01" },

      { productName: "Digitek (Mars2 #1)", category: "ACCESSORY", quantity: 1, serialNumber: "DT-06", purchasePrice: 900, kitName: "Hollyland Mars 4K Kit-02" },
      { productName: "Digitek (Mars2 #2)", category: "ACCESSORY", quantity: 1, serialNumber: "DT-07", purchasePrice: 900, kitName: "Hollyland Mars 4K Kit-02" },
      { productName: "Digitek (Mars2 #3)", category: "ACCESSORY", quantity: 1, serialNumber: "DT-08", purchasePrice: 900, kitName: "Hollyland Mars 4K Kit-02" },
      { productName: "Digitek (Mars2 #4)", category: "ACCESSORY", quantity: 1, serialNumber: "DT-09", purchasePrice: 900, kitName: "Hollyland Mars 4K Kit-02" },
      { productName: "Adaptor (Mars2)", category: "ACCESSORY", quantity: 1, serialNumber: "AD-02", purchasePrice: 1200, kitName: "Hollyland Mars 4K Kit-02" },

      { productName: "Digitek (Mars3)", category: "ACCESSORY", quantity: 1, serialNumber: "DT-10", purchasePrice: 900, kitName: "Hollyland Mars 4K Kit-03" },
      { productName: "Hollyland Adaptor", category: "ACCESSORY", quantity: 1, serialNumber: "HA-01", purchasePrice: 1500, kitName: "Hollyland Mars 4K Kit-03" },
      { productName: "INfitek+TYFY+Digitek Bundle", category: "ACCESSORY", quantity: 1, serialNumber: "BD-01", purchasePrice: 4500, kitName: "Hollyland Mars 4K Kit-03" },

      { productName: "Welborn (Accsoon #1)", category: "ACCESSORY", quantity: 1, serialNumber: "WB-04", purchasePrice: 1000, kitName: "Accsoon Master 4K Kit" },
      { productName: "Welborn (Accsoon #2)", category: "ACCESSORY", quantity: 1, serialNumber: "WB-05", purchasePrice: 1000, kitName: "Accsoon Master 4K Kit" },
      { productName: "Welborn (Accsoon #3)", category: "ACCESSORY", quantity: 1, serialNumber: "WB-06", purchasePrice: 1000, kitName: "Accsoon Master 4K Kit" },
      { productName: "Welborn (Accsoon #4)", category: "ACCESSORY", quantity: 1, serialNumber: "WB-07", purchasePrice: 1000, kitName: "Accsoon Master 4K Kit" },
      { productName: "Adaptor (Accsoon)", category: "ACCESSORY", quantity: 1, serialNumber: "AD-03", purchasePrice: 1200, kitName: "Accsoon Master 4K Kit" },

      { productName: "Live-U Accessory Pack", category: "ACCESSORY", quantity: 1, serialNumber: "LU-ACC-01", purchasePrice: 12000, kitName: "Live-U Solo HD Kit" },
      { productName: "Huawei Dongle #1", category: "ACCESSORY", quantity: 1, serialNumber: "HW-01", purchasePrice: 4000, kitName: "Live-U Solo HD Kit" },
      { productName: "Huawei Dongle #2", category: "ACCESSORY", quantity: 1, serialNumber: "HW-02", purchasePrice: 4000, kitName: "Live-U Solo HD Kit" },

      { productName: "Eartec 5 Pair (Main Body)", category: "ACCESSORY", quantity: 1, serialNumber: "ET-01", purchasePrice: 120000, kitName: "Eartec Talkback Kit" },
      { productName: "6 Battery HUB (Eartec)", category: "ACCESSORY", quantity: 1, serialNumber: "EH-01", purchasePrice: 15000, kitName: "Eartec Talkback Kit" },

      { productName: "Hollyland Tally 8 Pair", category: "ACCESSORY", quantity: 1, serialNumber: "HT-01", purchasePrice: 85000, kitName: "Tally System Kit" },
      { productName: "Tally System HUB", category: "ACCESSORY", quantity: 1, serialNumber: "TH-01", purchasePrice: 25000, kitName: "Tally System Kit" },
      { productName: "Battery HUB 8", category: "ACCESSORY", quantity: 1, serialNumber: "TBH-01", purchasePrice: 12000, kitName: "Tally System Kit" },
      { productName: "Tally Power Adapter #1", category: "ACCESSORY", quantity: 1, serialNumber: "TPA-01", purchasePrice: 2000, kitName: "Tally System Kit" },
      { productName: "Tally Power Adapter #2", category: "ACCESSORY", quantity: 1, serialNumber: "TPA-02", purchasePrice: 2000, kitName: "Tally System Kit" },

      { productName: "BAOFENG Walkie Talkie #1", category: "ACCESSORY", quantity: 1, serialNumber: "BF-01", purchasePrice: 1000 },
      { productName: "BAOFENG Walkie Talkie #2", category: "ACCESSORY", quantity: 1, serialNumber: "BF-02", purchasePrice: 1000 },
      { productName: "BAOFENG Walkie Talkie #3", category: "ACCESSORY", quantity: 1, serialNumber: "BF-03", purchasePrice: 1000 },
      { productName: "BAOFENG Walkie Talkie #4", category: "ACCESSORY", quantity: 1, serialNumber: "BF-04", purchasePrice: 1000 },
      { productName: "BAOFENG Walkie Talkie #5", category: "ACCESSORY", quantity: 1, serialNumber: "BF-05", purchasePrice: 1000 },
      { productName: "BAOFENG Walkie Talkie #6", category: "ACCESSORY", quantity: 1, serialNumber: "BF-06", purchasePrice: 1000 },

      { productName: "SDI to HDMI 3G #1", category: "ACCESSORY", quantity: 1, serialNumber: "SH-01", purchasePrice: 7000 },
      { productName: "SDI to HDMI 3G #2", category: "ACCESSORY", quantity: 1, serialNumber: "SH-02", purchasePrice: 7000 },
      { productName: "SDI to HDMI 3G #3", category: "ACCESSORY", quantity: 1, serialNumber: "SH-03", purchasePrice: 7000 },
      { productName: "SDI to HDMI 3G #4", category: "ACCESSORY", quantity: 1, serialNumber: "SH-04", purchasePrice: 7000 },
      { productName: "SDI to HDMI 3G #5", category: "ACCESSORY", quantity: 1, serialNumber: "SH-05", purchasePrice: 7000 },

      { productName: "USB to SATA Adapter #1", category: "ACCESSORY", quantity: 1, serialNumber: "US-01", purchasePrice: 2537 },
      { productName: "USB to SATA Adapter #2", category: "ACCESSORY", quantity: 1, serialNumber: "US-02", purchasePrice: 2537 },

      { productName: "Belden 4694R 12G SDI Cable", category: "ACCESSORY", quantity: 1, serialNumber: "BC-12G-01", purchasePrice: 22400 },
      { productName: "Neutrik BNC Connectors (Bag of 34)", category: "ACCESSORY", quantity: 1, serialNumber: "NB-34", purchasePrice: 15300 },
      { productName: "Belden BNC Connectors (Bag of 6)", category: "ACCESSORY", quantity: 1, serialNumber: "BB-06", purchasePrice: 2700 },

      { productName: "Micro Converter BiDirect 12G #1", category: "ACCESSORY", quantity: 1, serialNumber: "MC12-01", purchasePrice: 20060 },
      { productName: "Micro Converter BiDirect 12G #2", category: "ACCESSORY", quantity: 1, serialNumber: "MC12-02", purchasePrice: 20060 },
      { productName: "Micro Converter BiDirect 12G #3", category: "ACCESSORY", quantity: 1, serialNumber: "MC12-03", purchasePrice: 20060 },
      { productName: "Micro Converter BiDirect 12G #4", category: "ACCESSORY", quantity: 1, serialNumber: "MC12-04", purchasePrice: 20060 },
      { productName: "Micro Converter BiDirect 12G #5", category: "ACCESSORY", quantity: 1, serialNumber: "MC12-05", purchasePrice: 20060 },

      { productName: "24 Port Rack Patti (1)", category: "ACCESSORY", quantity: 1, serialNumber: "RP-24-01", purchasePrice: 11092 },
      { productName: "24 Port Rack Patti (2)", category: "ACCESSORY", quantity: 1, serialNumber: "RP-24-02", purchasePrice: 8071 },

      { productName: "Canare SDI Cable (Short)", category: "ACCESSORY", quantity: 1, serialNumber: "CS-01", purchasePrice: 872 },
      { productName: "Canare SDI Cable (Long)", category: "ACCESSORY", quantity: 1, serialNumber: "CL-01", purchasePrice: 19824 },

      { productName: "Micro Converter BiDirect (Generic) #1", category: "ACCESSORY", quantity: 1, serialNumber: "MC-G01", purchasePrice: null },
      { productName: "Micro Converter BiDirect (Generic) #2", category: "ACCESSORY", quantity: 1, serialNumber: "MC-G02", purchasePrice: null },
      { productName: "Micro Converter BiDirect (Generic) #3", category: "ACCESSORY", quantity: 1, serialNumber: "MC-G03", purchasePrice: null },
      { productName: "Micro Converter BiDirect (Generic) #4", category: "ACCESSORY", quantity: 1, serialNumber: "MC-G04", purchasePrice: null },
      { productName: "Micro Converter BiDirect (Generic) #5", category: "ACCESSORY", quantity: 1, serialNumber: "MC-G05", purchasePrice: null },
      { productName: "Micro Converter BiDirect (Generic) #6", category: "ACCESSORY", quantity: 1, serialNumber: "MC-G06", purchasePrice: null },
      { productName: "Micro Converter BiDirect (Generic) #7", category: "ACCESSORY", quantity: 1, serialNumber: "MC-G07", purchasePrice: null },
      { productName: "Micro Converter BiDirect (Generic) #8", category: "ACCESSORY", quantity: 1, serialNumber: "MC-G08", purchasePrice: null },
      { productName: "Micro Converter BiDirect (Generic) #9", category: "ACCESSORY", quantity: 1, serialNumber: "MC-G09", purchasePrice: null },
      { productName: "Micro Converter BiDirect (Generic) #10", category: "ACCESSORY", quantity: 1, serialNumber: "MC-G10", purchasePrice: null },
      { productName: "Micro Converter BiDirect (Generic) #11", category: "ACCESSORY", quantity: 1, serialNumber: "MC-G11", purchasePrice: null },
    ];

    // Let's add the specific accessories
    const specificAccessoriesCount = specificAccessories.length;
    for (const acc of specificAccessories) {
      const kitId = acc.kitName ? kitIds[acc.kitName] : null;
      insertEquip.run({
        productName: acc.productName,
        category: "ACCESSORY",
        quantity: 1,
        serialNumber: acc.serialNumber,
        bodyName: null,
        kitId,
        respPerson: "Vikram",
        purchasePrice: acc.purchasePrice
      });
    }

    // Now insert remaining (183 - specificAccessoriesCount) generic accessories
    const remainingCount = 183 - specificAccessoriesCount;
    for (let i = 1; i <= remainingCount; i++) {
      insertEquip.run({
        productName: `Generic Cable Accessory #${i}`,
        category: "ACCESSORY",
        quantity: 1,
        serialNumber: `ACC-S-${1000 + i}`,
        bodyName: null,
        kitId: null,
        respPerson: "Vikram",
        purchasePrice: 500 + (i % 5) * 100
      });
    }

    // Link remaining kit main bodies
    const tallyMain = db.prepare("SELECT id FROM equipment WHERE product_name = 'Hollyland Tally 8 Pair'").get() as { id: number } | undefined;
    if (tallyMain) {
      db.prepare("UPDATE kits SET main_body_id = ? WHERE id = ?").run(tallyMain.id, kitIds["Tally System Kit"]);
    }
    const eartecMain = db.prepare("SELECT id FROM equipment WHERE product_name = 'Eartec 5 Pair (Main Body)'").get() as { id: number } | undefined;
    if (eartecMain) {
      db.prepare("UPDATE kits SET main_body_id = ? WHERE id = ?").run(eartecMain.id, kitIds["Eartec Talkback Kit"]);
    }

    // Link kitId on main body items
    db.prepare("UPDATE equipment SET kit_id = ? WHERE product_name = 'Hollyland Tally 8 Pair'").run(kitIds["Tally System Kit"]);
    db.prepare("UPDATE equipment SET kit_id = ? WHERE product_name = 'Eartec 5 Pair (Main Body)'").run(kitIds["Eartec Talkback Kit"]);

    // Create a dummy booking for 'inq-1' on equipment 'Sony FX6 Kit' (main body is camera with ID 1)
    // to show conflict / warehouse check usage
    const fx6Equip = db.prepare("SELECT id FROM equipment WHERE product_name = 'Sony FX6'").get() as { id: number } | undefined;
    if (fx6Equip) {
      db.prepare(`
        INSERT INTO equipment_bookings (inquiry_id, equipment_id, kit_id, position, booked_from, booked_to, status)
        VALUES ('inq-1', ?, ?, 'Center Tally', '2026-05-10', '2026-05-12', 'BOOKED')
      `).run(fx6Equip.id, kitIds["Sony FX6 Kit"]);
    }
  });
}

function runStaffSeed(): void {
  const staffCount = (
    db.prepare("SELECT COUNT(*) as n FROM staff").get() as { n: number }
  ).n;

  if (staffCount !== 0) return;

  const insertStaff = db.prepare(`
    INSERT INTO staff
      (name, phone, role, staff_type, payment_type, rate_per_day, monthly_salary,
       with_equipment, equipment_desc, aadhar_number, aadhar_front, aadhar_back, is_active, created_at)
    VALUES
      (@name, @phone, @role, @staffType, @paymentType, @ratePerDay, @monthlySalary,
       @withEquipment, @equipmentDesc, @aadharNumber, @aadharFront, @aadharBack, 1, @createdAt)
  `);

  const insertAssignment = db.prepare(`
    INSERT INTO staff_assignments
      (staff_id, inquiry_id, position_no, position_name, days_assigned, rate_per_day, total_amount, is_duplicate, confirmed_dup, created_at)
    VALUES
      (@staffId, @inquiryId, @positionNo, @positionName, @daysAssigned, @ratePerDay, @totalAmount, @isDuplicate, @confirmedDup, @createdAt)
  `);

  const insertPayment = db.prepare(`
    INSERT INTO staff_payments
      (staff_id, assignment_id, inquiry_id, amount, payment_type, payment_method, reference_no, month, paid_at, notes)
    VALUES
      (@staffId, @assignmentId, @inquiryId, @amount, @paymentType, @paymentMethod, @referenceNo, @month, @paidAt, @notes)
  `);

  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const y = now.getFullYear();
  const d = (day: number) => `${y}-${m}-${String(day).padStart(2, "0")}`;

  db.transaction(() => {
    // 1. Insert Staff
    insertStaff.run({ name: "Rishi Kumar", phone: "9825011111", role: "Videographer", staffType: "INHOUSE", paymentType: "PER_DAY", ratePerDay: 1500, monthlySalary: null, withEquipment: 0, equipmentDesc: null, aadharNumber: "452187342190", aadharFront: "mock_front.jpg", aadharBack: "mock_back.jpg", createdAt: d(1) });
    insertStaff.run({ name: "Dev Vora", phone: "9825022222", role: "Videographer", staffType: "INHOUSE", paymentType: "PER_DAY", ratePerDay: 1500, monthlySalary: null, withEquipment: 0, equipmentDesc: null, aadharNumber: "123456789012", aadharFront: null, aadharBack: null, createdAt: d(1) });
    insertStaff.run({ name: "Mehul Shah", phone: "9825033333", role: "Photographer", staffType: "INHOUSE", paymentType: "MONTHLY", ratePerDay: null, monthlySalary: 45000, withEquipment: 0, equipmentDesc: null, aadharNumber: "223456789012", aadharFront: null, aadharBack: null, createdAt: d(1) });
    insertStaff.run({ name: "Hetal Patel", phone: "9825044444", role: "LED operator", staffType: "INHOUSE", paymentType: "PER_DAY", ratePerDay: 1200, monthlySalary: null, withEquipment: 0, equipmentDesc: null, aadharNumber: "323456789012", aadharFront: null, aadharBack: null, createdAt: d(1) });
    insertStaff.run({ name: "Jignesh Rao", phone: "9825055555", role: "Crane operator", staffType: "EXTERNAL", paymentType: "PER_DAY", ratePerDay: 2500, monthlySalary: null, withEquipment: 1, equipmentDesc: "Crane 32ft", aadharNumber: "423456789012", aadharFront: null, aadharBack: null, createdAt: d(1) });
    insertStaff.run({ name: "Karan Patel", phone: "9825066666", role: "Drone operator", staffType: "EXTERNAL", paymentType: "PER_DAY", ratePerDay: 3000, monthlySalary: null, withEquipment: 1, equipmentDesc: "DJI Drone", aadharNumber: "523456789012", aadharFront: null, aadharBack: null, createdAt: d(1) });
    insertStaff.run({ name: "Priya Joshi", phone: "9825077777", role: "Editor", staffType: "INHOUSE", paymentType: "MONTHLY", ratePerDay: null, monthlySalary: 35000, withEquipment: 0, equipmentDesc: null, aadharNumber: "623456789012", aadharFront: null, aadharBack: null, createdAt: d(1) });
    insertStaff.run({ name: "Nirav Parmar", phone: "9825088888", role: "Videographer", staffType: "INHOUSE", paymentType: "PER_DAY", ratePerDay: 1200, monthlySalary: null, withEquipment: 0, equipmentDesc: null, aadharNumber: "723456789012", aadharFront: null, aadharBack: null, createdAt: d(1) });
    insertStaff.run({ name: "Smit Mehta", phone: "9825099999", role: "Photo editor", staffType: "INHOUSE", paymentType: "MONTHLY", ratePerDay: null, monthlySalary: 28000, withEquipment: 0, equipmentDesc: null, aadharNumber: "823456789012", aadharFront: null, aadharBack: null, createdAt: d(1) });

    // Seed the Dholera Mahotsav Inquiry (April 15-20, i.e., in previous month or static)
    db.prepare(`
      INSERT OR IGNORE INTO inquiries (id, client_id, event_type, start_date, end_date, venue, notes, status, created_at)
      VALUES ('inq-4', 'client-4', 'Dholera Mahotsav', '2026-04-15', '2026-04-20', 'Dholera Grounds', 'Annual Festival', 'Confirmed', '2026-04-10')
    `).run();

    // 2. Insert Assignments
    // Rishi Kumar (staffId = 1) -> inq-1 (Adani Annual Meet)
    const ass1 = insertAssignment.run({ staffId: 1, inquiryId: "inq-1", positionNo: 1, positionName: "Center Tally", daysAssigned: 3, ratePerDay: 1500, totalAmount: 4500, isDuplicate: 1, confirmedDup: 1, createdAt: d(9) });
    const ass2 = insertAssignment.run({ staffId: 1, inquiryId: "inq-1", positionNo: 2, positionName: "Center Semi Wide", daysAssigned: 3, ratePerDay: 1500, totalAmount: 4500, isDuplicate: 1, confirmedDup: 1, createdAt: d(9) });
    
    // Rishi Kumar -> inq-2 (Torrent Pharma)
    const ass3 = insertAssignment.run({ staffId: 1, inquiryId: "inq-2", positionNo: 1, positionName: "Videographer", daysAssigned: 2, ratePerDay: 1500, totalAmount: 3000, isDuplicate: 0, confirmedDup: 0, createdAt: d(9) });

    // Dev Vora (staffId = 2) -> inq-1
    const ass4 = insertAssignment.run({ staffId: 2, inquiryId: "inq-1", positionNo: 5, positionName: "Photo 1", daysAssigned: 3, ratePerDay: 1500, totalAmount: 4500, isDuplicate: 0, confirmedDup: 0, createdAt: d(9) });
    // Dev Vora -> inq-2
    const ass5 = insertAssignment.run({ staffId: 2, inquiryId: "inq-2", positionNo: 2, positionName: "Videographer", daysAssigned: 2, ratePerDay: 1500, totalAmount: 3000, isDuplicate: 0, confirmedDup: 0, createdAt: d(9) });

    // Hetal Patel (staffId = 4) -> inq-4 (Dholera Mahotsav)
    const ass6 = insertAssignment.run({ staffId: 4, inquiryId: "inq-4", positionNo: 1, positionName: "LED operator", daysAssigned: 6, ratePerDay: 1200, totalAmount: 7200, isDuplicate: 0, confirmedDup: 0, createdAt: "2026-04-10" });

    // Jignesh Rao (staffId = 5) -> inq-1
    const ass7 = insertAssignment.run({ staffId: 5, inquiryId: "inq-1", positionNo: 3, positionName: "Video Crane 32ft", daysAssigned: 3, ratePerDay: 2500, totalAmount: 7500, isDuplicate: 0, confirmedDup: 0, createdAt: d(9) });
    // Jignesh Rao -> inq-4 (Dholera Mahotsav)
    const ass8 = insertAssignment.run({ staffId: 5, inquiryId: "inq-4", positionNo: 2, positionName: "Video Crane 32ft", daysAssigned: 6, ratePerDay: 2500, totalAmount: 15000, isDuplicate: 0, confirmedDup: 0, createdAt: "2026-04-10" });

    // Karan Patel (staffId = 6) -> inq-1
    const ass9 = insertAssignment.run({ staffId: 6, inquiryId: "inq-1", positionNo: 4, positionName: "Drone", daysAssigned: 3, ratePerDay: 3000, totalAmount: 9000, isDuplicate: 0, confirmedDup: 0, createdAt: d(9) });
    // Karan Patel -> inq-4 (Dholera Mahotsav)
    const ass10 = insertAssignment.run({ staffId: 6, inquiryId: "inq-4", positionNo: 3, positionName: "Drone", daysAssigned: 5, ratePerDay: 3000, totalAmount: 15000, isDuplicate: 0, confirmedDup: 0, createdAt: "2026-04-10" });

    // 3. Insert Payments
    // Rishi Kumar (staffId = 1) -> Paid for Adani Meet (ass1 row, total Rs 4500)
    insertPayment.run({ staffId: 1, assignmentId: ass1.lastInsertRowid as number, inquiryId: "inq-1", amount: 4500, paymentType: "PER_EVENT", paymentMethod: "UPI", referenceNo: "UPI123456", month: null, paidAt: d(12), notes: "Center Tally pay" });
    
    // Dev Vora (staffId = 2) -> Paid for Adani Meet (ass4) and Torrent Pharma (ass5)
    insertPayment.run({ staffId: 2, assignmentId: ass4.lastInsertRowid as number, inquiryId: "inq-1", amount: 4500, paymentType: "PER_EVENT", paymentMethod: "CASH", referenceNo: "", month: null, paidAt: d(13), notes: "Adani Meet pay" });
    insertPayment.run({ staffId: 2, assignmentId: ass5.lastInsertRowid as number, inquiryId: "inq-2", amount: 3000, paymentType: "PER_EVENT", paymentMethod: "CASH", referenceNo: "", month: null, paidAt: d(16), notes: "Torrent Pharma pay" });

    // Karan Patel (staffId = 6) -> Partial payment for Dholera Mahotsav (ass10, total Rs 15000, paid Rs 9000)
    insertPayment.run({ staffId: 6, assignmentId: ass10.lastInsertRowid as number, inquiryId: "inq-4", amount: 9000, paymentType: "PER_EVENT", paymentMethod: "BANK_TRANSFER", referenceNo: "TXN987654", month: null, paidAt: "2026-04-22", notes: "Partial pay" });

    // Priya Joshi (staffId = 7) -> Paid monthly salary for May 2026 (or dynamically current month)
    insertPayment.run({ staffId: 7, assignmentId: null, inquiryId: null, amount: 35000, paymentType: "MONTHLY_SALARY", paymentMethod: "BANK_TRANSFER", referenceNo: "SALARYMAY26", month: `${y}-${m}`, paidAt: d(20), notes: "May Fixed Salary" });
  });
}

try {
  runSeed();
  runPhase2Seed();
  runStaffSeed();
} catch (err) {
  console.error("Seeding error:", err);
}

