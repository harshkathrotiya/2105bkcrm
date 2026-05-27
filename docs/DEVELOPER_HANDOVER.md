# BK Media CRM — Developer Handover Package
## Complete Project Summary

**Project:** BK Media CRM
**Company:** BK Media, Vadodara, Gujarat
**Date:** May 2026
**Stack:** Next.js + Node.js/Express.js + PostgreSQL (Prisma ORM)

---

## Files in this package

| File | Type | Description |
|------|------|-------------|
| BK_Media_Kit1_Video_UI.html | UI | Kit 1 Video Department — 9 screens |
| BK_Media_Kit1_Functional_Requirements.md | FRD | Kit 1 full functional requirements |
| BK_Media_Phase2_UI.html | UI | Phase 2 Equipment & Warehouse — 8 screens |
| BK_Media_Phase2_Functional_Requirements.md | FRD | Phase 2 full functional requirements |
| BK_Media_Staff_UI.html | UI | Staff Module — 7 screens |
| BK_Media_Staff_Functional_Requirements.md | FRD | Staff module full functional requirements |
| BK_Media_CRM_Documentation.md | TECH | Full technical documentation |
| DEVELOPER_HANDOVER.md | THIS FILE | Complete handover summary |

---

## 1. Project Overview

BK Media CRM is an internal business management system for BK Media, Vadodara.

### Modules

| Module | Phase | Status | Screens |
|--------|-------|--------|---------|
| Client management | Phase 1 | Design complete | 2 |
| Calendar | Phase 1 | Design complete | 1 |
| Inquiry | Phase 1 | Design complete | 1 |
| Quotation | Phase 1 | Design complete | 2 |
| Approval | Phase 1 | Design complete | 1 |
| Invoice | Phase 1 | Design complete | 1 |
| Payment tracking | Phase 1 | Design complete | 1 |
| Equipment master | Phase 2 | Design complete | 2 |
| Kit management | Phase 2 | Design complete | 2 |
| Warehouse check | Phase 2 | Design complete | 1 |
| Vendor management | Phase 2 | Design complete | 2 |
| Staff management | Staff | Design complete | 7 |
| Client requirements PDF | Staff | Design complete | 1 |
| Staff event brief | Staff | Design complete | 1 |
| Expense report & P&L | Staff | Design complete | 1 |

**Total screens designed: 26**

---

## 2. Tech Stack

```
Frontend:   Next.js 14+ (App Router)
Backend:    Node.js + Express.js
Database:   PostgreSQL
ORM:        Prisma
Auth:       NextAuth.js / JWT
File upload: AWS S3 or Cloudinary (Aadhar, PDFs)
PDF:        Puppeteer or React-PDF
WhatsApp:   WhatsApp Business API (Meta)
Hosting:    Vercel (frontend) + Railway/Render (backend)
```

---

## 3. Business Rules — Critical

### Quotation number format
```
BKM/{FY}/{MM}/{NNN}
Example: BKM/26-27/05/016

Financial Year: April-March
  Month >= 4: FY = "YY-(YY+1)"  e.g. May 2026 = "26-27"
  Month < 4:  FY = "(YY-1)-YY"  e.g. Feb 2026 = "25-26"

NNN = sequential per FY, padded to 3 digits, resets April 1
Revision: BKM/26-27/05/016-1, -2, -3...
```

### Invoice number format
```
BKM-INV-{FY}/{MM}/{NNN}
Example: BKM-INV-26-27/05/008
```

### GST
```
Gujarat intra-state: CGST 9% + SGST 9% = 18% total
Applied on subtotal only
CGST = SGST always
```

### Video invoice — CRITICAL
```
Exactly 2 line items ONLY:
1. Videography services
2. Photography services
NO item-wise rates shown to client
```

### HDD delivery
```
Only after full payment received
> 500 GB = 2 TB HDD
> 200 GB = 1 TB HDD
<= 200 GB = 500 GB HDD
```

### Quotation PDF — client sees
```
Position + Equipment description + Days ONLY
Rate per day: HIDDEN
Amount per item: HIDDEN
Subtotal + CGST + SGST + Total: SHOWN
```

### Staff assignment duplicate
```
1 staff = 1 position per event (default)
Duplicate assign = warning popup
After confirmation: allowed
Payment counted ONCE per staff regardless of position count
```

### Equipment kit
```
Kit = 1 main body + accessories
Kit dispatch = all items booked together
Kit availability: AVAILABLE / PARTIAL / UNAVAILABLE
```

---

## 4. Complete Database Schema (Prisma)

```prisma
// ─── CLIENTS ───────────────────────────────────────────
model Client {
  id            Int       @id @default(autoincrement())
  name          String
  phone         String    // 10 digits
  contactPerson String
  email         String?
  gstNumber     String?   // 15 chars
  panNumber     String?   // 10 chars
  addressLine   String?
  city          String
  district      String
  state         String    @default("Gujarat")
  pinCode       String?
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  inquiries     Inquiry[]
}

// ─── INQUIRIES ──────────────────────────────────────────
model Inquiry {
  id            Int       @id @default(autoincrement())
  clientId      Int
  client        Client    @relation(fields: [clientId], references: [id])
  eventType     String
  // CORPORATE | RELIGIOUS | WEDDING | CONFERENCE | CONCERT | GOVERNMENT | OTHER
  startDate     DateTime
  endDate       DateTime
  venue         String
  notes         String?
  status        String    @default("INQUIRY")
  // INQUIRY | QUOTATION_SENT | CONFIRMED | COMPLETED | CANCELLED
  department    String    @default("VIDEO")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  quotations          Quotation[]
  invoices            Invoice[]
  equipmentBookings   EquipmentBooking[]
  staffAssignments    StaffAssignment[]
}

// ─── QUOTATIONS ─────────────────────────────────────────
model Quotation {
  id              Int       @id @default(autoincrement())
  inquiryId       Int
  inquiry         Inquiry   @relation(fields: [inquiryId], references: [id])
  quotationNumber String    @unique // BKM/26-27/05/016
  revisionNumber  Int       @default(0)
  status          String    @default("DRAFT")
  // DRAFT | SENT | APPROVED | REVISED | CANCELLED
  subtotal        Decimal   @db.Decimal(12,2)
  cgst            Decimal   @db.Decimal(12,2)
  sgst            Decimal   @db.Decimal(12,2)
  total           Decimal   @db.Decimal(12,2)
  approvedAt      DateTime?
  signedCopyUrl   String?
  createdAt       DateTime  @default(now())

  items           VideoQuotationItem[]
  invoices        Invoice[]
}

// ─── VIDEO QUOTATION ITEMS ──────────────────────────────
model VideoQuotationItem {
  id            Int       @id @default(autoincrement())
  quotationId   Int
  quotation     Quotation @relation(fields: [quotationId], references: [id])
  position      String    // Center Tally, Wireless 1 etc.
  equipmentType String    // FS6, Z150, FX3+Wireless, DSLR etc.
  ratePerDay    Decimal   @db.Decimal(10,2)
  days          Int
  amount        Decimal   @db.Decimal(12,2)  // ratePerDay x days
  sortOrder     Int       @default(0)
}

// ─── INVOICES ───────────────────────────────────────────
model Invoice {
  id              Int       @id @default(autoincrement())
  inquiryId       Int
  inquiry         Inquiry   @relation(fields: [inquiryId], references: [id])
  quotationId     Int?
  quotation       Quotation? @relation(fields: [quotationId], references: [id])
  invoiceNumber   String    @unique // BKM-INV-26-27/05/008
  invoiceDate     DateTime  @default(now())
  dueDate         DateTime?
  subtotal        Decimal   @db.Decimal(12,2)
  cgst            Decimal   @db.Decimal(12,2)
  sgst            Decimal   @db.Decimal(12,2)
  grossTotal      Decimal   @db.Decimal(12,2)
  advancePaid     Decimal   @db.Decimal(12,2) @default(0)
  balanceDue      Decimal   @db.Decimal(12,2)
  status          String    @default("PENDING")
  // PENDING | PARTIAL | PAID
  hddDelivered    Boolean   @default(false)
  hddSizeGb       Int?
  createdAt       DateTime  @default(now())

  payments        InvoicePayment[]
}

// ─── INVOICE PAYMENTS ───────────────────────────────────
model InvoicePayment {
  id              Int       @id @default(autoincrement())
  invoiceId       Int
  invoice         Invoice   @relation(fields: [invoiceId], references: [id])
  amount          Decimal   @db.Decimal(12,2)
  paymentType     String    // ADVANCE | BALANCE | FULL
  paymentMethod   String    // CASH | UPI | BANK_TRANSFER | CHEQUE
  referenceNo     String?
  paidAt          DateTime  @default(now())
  notes           String?
}

// ─── EQUIPMENT ──────────────────────────────────────────
model Equipment {
  id              Int       @id @default(autoincrement())
  productName     String
  category        String
  // CAMERA | VIDEO_MIXER | VIDEO_RECORDER | AUDIO_MIXER
  // WIRELESS_TX | UPS | ACCESSORY
  quantity        Int       @default(1)
  serialNumber    String?
  bodyName        String?
  kitId           Int?
  kit             Kit?      @relation(fields: [kitId], references: [id])
  respPerson      String?
  purchaseDate    DateTime?
  purchaseFrom    String?
  billNumber      String?
  purchasePrice   Decimal?  @db.Decimal(12,2)
  status          String    @default("AVAILABLE")
  // AVAILABLE | IN_USE | MAINTENANCE | SOLD | RETIRED
  notes           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  bookings        EquipmentBooking[]
}

// ─── KITS ────────────────────────────────────────────────
model Kit {
  id          Int       @id @default(autoincrement())
  name        String    @unique
  description String?
  mainBodyId  Int?
  createdAt   DateTime  @default(now())

  items       Equipment[]
  bookings    EquipmentBooking[]
}

// ─── EQUIPMENT BOOKINGS ─────────────────────────────────
model EquipmentBooking {
  id               Int        @id @default(autoincrement())
  inquiryId        Int
  inquiry          Inquiry    @relation(fields: [inquiryId], references: [id])
  equipmentId      Int?
  equipment        Equipment? @relation(fields: [equipmentId], references: [id])
  kitId            Int?
  kit              Kit?       @relation(fields: [kitId], references: [id])
  position         String?
  bookedFrom       DateTime
  bookedTo         DateTime
  status           String     @default("BOOKED") // BOOKED | OUT | RETURNED
  vendorId         Int?
  vendor           Vendor?    @relation(fields: [vendorId], references: [id])
  vendorCostPerDay Decimal?   @db.Decimal(10,2)
  totalVendorCost  Decimal?   @db.Decimal(12,2)
  confirmedAt      DateTime?
}

// ─── VENDORS ─────────────────────────────────────────────
model Vendor {
  id              Int      @id @default(autoincrement())
  name            String
  phone           String
  email           String?
  specialization  String?
  city            String?
  gstNumber       String?
  notes           String?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())

  bookings        EquipmentBooking[]
}

// ─── STAFF ───────────────────────────────────────────────
model Staff {
  id              Int       @id @default(autoincrement())
  name            String
  phone           String
  role            String
  // VIDEOGRAPHER | PHOTOGRAPHER | CRANE_OPERATOR | DRONE_OPERATOR
  // LED_OPERATOR | AUDIO_OPERATOR | EDITOR | PHOTO_EDITOR | OTHER
  staffType       String    // INHOUSE | EXTERNAL
  paymentType     String    // PER_DAY | MONTHLY
  ratePerDay      Decimal?  @db.Decimal(10,2)
  monthlySalary   Decimal?  @db.Decimal(10,2)
  withEquipment   Boolean   @default(false)
  equipmentDesc   String?
  aadharNumber    String?
  aadharFront     String?
  aadharBack      String?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  assignments     StaffAssignment[]
  payments        StaffPayment[]
}

// ─── STAFF ASSIGNMENTS ───────────────────────────────────
model StaffAssignment {
  id              Int      @id @default(autoincrement())
  staffId         Int
  staff           Staff    @relation(fields: [staffId], references: [id])
  inquiryId       Int
  inquiry         Inquiry  @relation(fields: [inquiryId], references: [id])
  positionNo      Int?
  positionName    String?
  daysAssigned    Int
  ratePerDay      Decimal  @db.Decimal(10,2)
  totalAmount     Decimal  @db.Decimal(12,2)
  isDuplicate     Boolean  @default(false)
  confirmedDup    Boolean  @default(false)
  createdAt       DateTime @default(now())

  payments        StaffPayment[]
}

// ─── STAFF PAYMENTS ──────────────────────────────────────
model StaffPayment {
  id              Int             @id @default(autoincrement())
  staffId         Int
  staff           Staff           @relation(fields: [staffId], references: [id])
  assignmentId    Int?
  assignment      StaffAssignment? @relation(fields: [assignmentId], references: [id])
  inquiryId       Int?
  amount          Decimal         @db.Decimal(12,2)
  paymentType     String          // PER_EVENT | MONTHLY_SALARY
  paymentMethod   String          // CASH | UPI | BANK_TRANSFER | CHEQUE
  referenceNo     String?
  month           String?         // "2026-05" for monthly
  paidAt          DateTime        @default(now())
  notes           String?
}
```

---

## 5. Complete API Endpoints

Base URL: `/api/v1`

### Clients
```
GET    /clients?search=&status=&page=&limit=
POST   /clients
GET    /clients/:id
PUT    /clients/:id
```

### Inquiries
```
GET    /inquiries?dept=VIDEO&status=&month=&page=
POST   /inquiries
GET    /inquiries/:id
PUT    /inquiries/:id
PUT    /inquiries/:id/status
```

### Quotations
```
GET    /quotations?inquiryId=
POST   /quotations
GET    /quotations/:id
PUT    /quotations/:id
POST   /quotations/:id/revise
POST   /quotations/:id/approve
POST   /quotations/:id/send
GET    /quotations/:id/pdf
GET    /quotations/next-number
```

### Video Quotation Items
```
POST   /video/quotation-items/bulk
PUT    /video/quotation-items/:id
DELETE /video/quotation-items/:id
GET    /video/equipment-defaults       // Returns all 20 positions with default rates
```

### Invoices
```
GET    /invoices?inquiryId=
POST   /invoices
GET    /invoices/:id
GET    /invoices/:id/pdf
POST   /invoices/:id/record-payment
POST   /invoices/:id/mark-hdd-delivered
GET    /invoices/next-number
```

### Calendar
```
GET    /calendar/events?month=2026-05&dept=VIDEO
```

### Equipment
```
GET    /equipment?category=&status=&search=&page=&limit=
POST   /equipment
GET    /equipment/:id
PUT    /equipment/:id
DELETE /equipment/:id
POST   /equipment/import-csv
GET    /equipment/asset-summary
GET    /equipment/availability?startDate=&endDate=
```

### Kits
```
GET    /kits
POST   /kits
GET    /kits/:id
PUT    /kits/:id
DELETE /kits/:id
POST   /kits/:id/add-item
DELETE /kits/:id/remove-item/:equipmentId
GET    /kits/:id/availability?startDate=&endDate=
```

### Equipment Bookings (Warehouse)
```
GET    /equipment-bookings?inquiryId=
POST   /equipment-bookings
PUT    /equipment-bookings/:id/confirm
PUT    /equipment-bookings/:id/return
POST   /equipment-bookings/bulk-confirm
GET    /warehouse/check?inquiryId=
```

### Vendors
```
GET    /vendors?search=&status=
POST   /vendors
GET    /vendors/:id
PUT    /vendors/:id
GET    /vendors/:id/history
```

### Staff
```
GET    /staff?type=&paymentType=&status=&search=&page=
POST   /staff
GET    /staff/:id
PUT    /staff/:id
DELETE /staff/:id
POST   /staff/:id/aadhar
GET    /staff/:id/history
GET    /staff/:id/summary
GET    /staff/availability?startDate=&endDate=&role=
```

### Staff Assignments
```
GET    /staff-assignments?inquiryId=
POST   /staff-assignments
PUT    /staff-assignments/:id
DELETE /staff-assignments/:id
POST   /staff-assignments/check-duplicate
POST   /staff-assignments/confirm-duplicate
```

### Staff Payments
```
GET    /staff-payments?inquiryId=&month=&status=
POST   /staff-payments
POST   /staff-payments/bulk
GET    /staff-payments/monthly-report?month=2026-05
```

### Reports
```
GET    /reports/assets/summary
GET    /reports/assets/pdf
GET    /reports/expense?inquiryId=
GET    /reports/pl?inquiryId=
GET    /reports/client-requirements?inquiryId=
GET    /reports/client-requirements/pdf?inquiryId=
GET    /reports/staff-brief?inquiryId=&staffId=
```

---

## 6. Video Equipment Default Rates (Seed Data)

```javascript
const videoEquipmentDefaults = [
  { position: 'Center Tally',        type: 'FS6',            ratePerDay: 20000 },
  { position: 'Center Semi Wide',    type: 'FS6',            ratePerDay: 20000 },
  { position: 'Center Full Wide',    type: 'Z150',           ratePerDay: 8000  },
  { position: 'Left Side',           type: 'FS6',            ratePerDay: 20000 },
  { position: 'Right Side',          type: 'FS6',            ratePerDay: 20000 },
  { position: 'Wireless 1',          type: 'FX3 + Wireless', ratePerDay: 10000 },
  { position: 'Wireless 2',          type: 'FX3 + Wireless', ratePerDay: 10000 },
  { position: 'Wireless 3',          type: 'FX3 + Wireless', ratePerDay: 10000 },
  { position: 'Wireless 4',          type: 'FX3 + Wireless', ratePerDay: 10000 },
  { position: 'Photo 1',             type: 'DSLR',           ratePerDay: 8000  },
  { position: 'Photo 2',             type: 'DSLR',           ratePerDay: 8000  },
  { position: 'Photo 3',             type: 'DSLR',           ratePerDay: 8000  },
  { position: 'Photo 4',             type: 'DSLR',           ratePerDay: 8000  },
  { position: 'Source PC',           type: 'PC',             ratePerDay: 5000  },
  { position: 'Youtube Live',        type: 'Live PC',        ratePerDay: 5000  },
  { position: 'Editor',              type: 'Editor',         ratePerDay: 5000  },
  { position: 'Photo Editor',        type: 'Photo Editor',   ratePerDay: 5000  },
  { position: 'Video Crane 32 Feet', type: 'Crane 32 Feet',  ratePerDay: 15000 },
  { position: 'Drone',               type: 'Drone',          ratePerDay: 12000 },
  { position: 'FPV',                 type: 'FPV',            ratePerDay: 15000 },
];
```

---

## 7. Known Equipment Purchase Prices (Seed Data)

```javascript
const equipmentPrices = [
  { no: 8,   name: 'Sony 200-600mm G 01',     price: 150000  },
  { no: 9,   name: 'Sony 200-600mm G 02',     price: 150000  },
  { no: 10,  name: 'Sony 400-800mm G',         price: 270000  },
  { no: 11,  name: 'Sony FX3',                 price: 340000  },
  { no: 20,  name: 'Sony Z150-01',             price: 285000  },
  { no: 25,  name: 'Sony Z150-02',             price: 285000  },
  { no: 30,  name: 'Sony Z150-03',             price: 285000  },
  { no: 35,  name: 'Sony Z150-05',             price: 285000  },
  { no: 173, name: 'Micro Converter BiDir x5', price: 100300  },
  { no: 174, name: 'BM Videohub 20x20 12G',   price: 247800  },
  { no: 210, name: 'Hyundai Intercom WT13',    price: 211173  },
  { no: 218, name: 'Sony ILCE 7M5',            price: 194915  },
  { no: 219, name: 'Sony Charger+Battery',     price: 20678   },
  { no: 220, name: 'Lexar 320GB CF-A',         price: 30508   },
  { no: 221, name: 'Sony 24-240mm',            price: 61017   },
  { no: 222, name: 'Sony 16-35mm Z',           price: 66102   },
  { no: 223, name: 'Godox V860 III',           price: 12712   },
];
```

---

## 8. Kit Structure (Seed Data)

```javascript
const kits = [
  {
    name: 'Sony FX6 Kit',
    mainBody: 'Sony FX6', // serial: 7000701
    accessories: ['Sony Charger','Lexar Card 160GB x2','Sony BP-U35','Welborn','Lexar Type A','Digitek']
  },
  {
    name: 'Sony FX3 Kit',
    mainBody: 'Sony FX3', // serial: 1002576
    accessories: ['Lexar Card 160GB x2','Sony NP-FZ100 x3','Sony Charger','Digitek']
  },
  {
    name: 'Sony Alpha 7S III Kit',
    mainBody: 'Sony Alpha 7S III', // serial: 5781062
    accessories: ['Lexar 900mbps x2','NP-FZ100 x3','BC-QZ1','24-70mm 2.8 GM','16-35mm ZEISS','Sigma 35mm','50mm 1.8','70-200mm 2.8','CF Type A Reader','Digitek LED','Digitek NP-F750']
  },
  {
    name: 'Sony Alpha 7 IV Kit',
    mainBody: 'Sony Alpha 7 IV', // serial: 8468677
    accessories: ['24-105mm G','85mm 1.8','GODOX V860','NP-FZ100 x2','BC-QZ1','GODOX VB26 x3','GODOX VC26']
  },
  {
    name: 'Sony ILCE 7M5 Kit',
    mainBody: 'Sony ILCE 7M5', // serial: 2027594
    accessories: ['Charger+Battery','Lexar 320GB CF-A','24-240mm','16-35mm Z','Godox V860 III']
  },
  { name: 'Z150-01 Kit', mainBody: 'Sony Z150-01', accessories: ['Lexar 64GB','NP-F770','Welborn','BC-L1'] },
  { name: 'Z150-02 Kit', mainBody: 'Sony Z150-02', accessories: ['Lexar 64GB','NP-F770','DigiTek NP-F950','DigiTek BC-L1'] },
  { name: 'Z150-03 Kit', mainBody: 'Sony Z150-03', accessories: ['Lexar 64GB','NP-F770','Welborn','BC-L1'] },
  { name: 'Z150-05 Kit', mainBody: 'Sony Z150-05', accessories: ['Lexar 64GB','NP-F770','Osaka','BC-L1'] },
  { name: 'Hollyland Mars 4K Kit-01', mainBody: 'Mars 4K-01', accessories: ['Digitek x3','TYFY'] },
  { name: 'Hollyland Mars 4K Kit-02', mainBody: 'Mars 4K-02', accessories: ['Digitek x4','Adaptor'] },
  { name: 'Hollyland Mars 4K Kit-03', mainBody: 'Mars 4K-03', accessories: ['Digitek','Hollyland Adaptor','INfitek+TYFY+Digitek'] },
  { name: 'Accsoon Master 4K Kit',    mainBody: 'Accsoon Master 4K', accessories: ['Welborn x4','Adaptor'] },
  { name: 'Live-U Solo HD Kit',       mainBody: 'Live-U Solo HD', accessories: ['Live-U acc','Huawei x2'] },
  { name: 'Eartec Talkback Kit',      mainBody: 'Eartec 5 Pair', accessories: ['6 Battery HUB'] },
  { name: 'Tally System Kit',         mainBody: 'Hollyland Tally 8 Pair', accessories: ['HUB','Battery HUB 8','Adapter x2'] },
];
```

---

## 9. Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/bkmedia_crm"

# Auth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://crm.bkmedia.in"

# File upload (Cloudinary or S3)
CLOUDINARY_URL="cloudinary://..."
# OR
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_S3_BUCKET="bkmedia-crm"

# WhatsApp Business API (Meta)
WHATSAPP_API_TOKEN=""
WHATSAPP_PHONE_NUMBER_ID=""

# App
NEXT_PUBLIC_APP_URL="https://crm.bkmedia.in"
NODE_ENV="production"
```

---

## 10. Development Setup

```bash
# Clone and install
git clone <repo>
cd bkmedia-crm
npm install

# Setup database
npx prisma generate
npx prisma db push
npx prisma db seed   # Seeds equipment defaults, kit structure

# Run dev
npm run dev          # Next.js on :3000
npm run dev:api      # Express API on :4000
```

---

## 11. Folder Structure (Recommended)

```
bkmedia-crm/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Login pages
│   ├── dashboard/
│   ├── clients/
│   ├── calendar/
│   ├── inquiries/
│   │   └── [id]/
│   │       ├── quotation/
│   │       ├── approval/
│   │       ├── invoice/
│   │       ├── payment/
│   │       ├── warehouse/
│   │       ├── operators/
│   │       └── expense/
│   ├── equipment/
│   ├── kits/
│   ├── vendors/
│   └── staff/
├── api/                        # Express API
│   ├── routes/
│   │   ├── clients.js
│   │   ├── inquiries.js
│   │   ├── quotations.js
│   │   ├── invoices.js
│   │   ├── equipment.js
│   │   ├── kits.js
│   │   ├── warehouse.js
│   │   ├── vendors.js
│   │   ├── staff.js
│   │   └── reports.js
│   └── middleware/
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── lib/
│   ├── pdf/                    # Puppeteer PDF generators
│   ├── whatsapp/               # WhatsApp API
│   └── utils/
│       ├── quotationNumber.js  # BKM/FY/MM/NNN generator
│       └── hddSize.js          # HDD size calculator
└── public/
```

---

## 12. Key Utility Functions

### Quotation number generator
```javascript
// lib/utils/quotationNumber.js
export function generateQuotationNumber(date, sequence) {
  const d = new Date(date);
  const month = d.getMonth() + 1; // 1-12
  const year = d.getFullYear();

  let fyStart, fyEnd;
  if (month >= 4) {
    fyStart = year % 100;
    fyEnd = (year + 1) % 100;
  } else {
    fyStart = (year - 1) % 100;
    fyEnd = year % 100;
  }

  const fy = `${fyStart}-${fyEnd}`;
  const mm = String(month).padStart(2, '0');
  const nnn = String(sequence).padStart(3, '0');

  return `BKM/${fy}/${mm}/${nnn}`;
  // e.g. BKM/26-27/05/016
}
```

### HDD size calculator
```javascript
// lib/utils/hddSize.js
export function getHddSize(totalGb) {
  if (totalGb > 500) return '2 TB';
  if (totalGb > 200) return '1 TB';
  return '500 GB';
}
```

### GST calculator
```javascript
// lib/utils/gst.js
export function calculateGst(subtotal) {
  const cgst = Math.round(subtotal * 0.09 * 100) / 100;
  const sgst = Math.round(subtotal * 0.09 * 100) / 100;
  const total = subtotal + cgst + sgst;
  return { subtotal, cgst, sgst, total };
}
```

---

## 13. PDF Generation Notes

```javascript
// Two PDF types:

// 1. Quotation PDF — client sees
//    Position + Equipment + Days only
//    NO rates, NO amounts per item
//    Shows: Subtotal + CGST + SGST + Total

// 2. Invoice PDF — Video department
//    EXACTLY 2 line items:
//    - Videography services
//    - Photography services
//    Shows: Amounts, CGST, SGST, Gross, Advance, Balance

// 3. Client requirements PDF
//    Staff list (name + Aadhar + position + arrival time)
//    Power requirements
//    Tables + space
//    Other requirements

// Recommended: puppeteer or @react-pdf/renderer
```

---

## 14. WhatsApp Message Template

```javascript
// For each staff member:
const message = `
*📋 Event Brief — BK Media*

Namaste ${staff.name} bhai 🙏
Tamara next event ni details:

📅 *Date:* ${formatDate(inquiry.startDate)} – ${formatDate(inquiry.endDate)}
⏰ *Reporting time:* ${assignment.reportingTime}
📍 *Venue:* ${inquiry.venue}
🎯 *Your position:* ${assignment.positionName}
📷 *Equipment:* ${assignment.equipmentType}
👔 *Event:* ${inquiry.eventType} — ${client.name}

*Event scale:*
👥 Total staff: ${totalStaff}
📷 Camera positions: ${cameraCount}
🎛 Control room: Yes
🏗 Crane: ${hasCrane ? 'Yes' : 'No'}

*Important:*
• ID card / Aadhar sathe aavo
• Venue parking available
• Meals arranged by client

Koi sawaal hoy to call karo: +91 98250 00000
`;
```

---

*BK Media CRM — Developer Handover Package*
*Phase 1 (Video) + Phase 2 (Equipment) + Staff Module*
*26 screens designed · Complete FRDs · Full Prisma schema · All API endpoints*
*May 2026*
