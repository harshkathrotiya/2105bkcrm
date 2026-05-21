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
  // eslint-disable-next-line no-var
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

try {
  runSeed();
} catch {
  // During `next build`, Turbopack may load this module in up to 7 parallel
  // workers (separate processes, each with their own globalThis). Multiple
  // workers may attempt to seed concurrently, causing SQLITE_BUSY or UNIQUE
  // constraint failures. These are safe to ignore because the data will have
  // been inserted by whichever worker won the race.
}
