import type { NextRequest } from "next/server";
import { db } from "@/lib/db";

// Simple CSV parser that handles quotes and commas
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(cell.trim());
      lines.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length > 0) {
    row.push(cell.trim());
    lines.push(row);
  }

  return lines.filter(r => r.length > 0 && r.some(c => c !== ""));
}

export async function POST(request: NextRequest) {
  try {
    const { csvText } = await request.json();
    if (!csvText || typeof csvText !== "string") {
      return Response.json({ error: "csvText is required as string" }, { status: 400 });
    }

    const rows = parseCSV(csvText);
    if (rows.length < 2) {
      return Response.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });
    }

    const headers = rows[0].map(h => h.toLowerCase().replace(/_/g, "").trim());
    
    // Find index of required fields
    const idxProductName = headers.findIndex(h => h === "productname" || h === "name" || h === "item");
    const idxCategory = headers.findIndex(h => h === "category" || h === "type");
    
    if (idxProductName === -1) {
      return Response.json({ error: "CSV header is missing 'product_name' or 'name'" }, { status: 400 });
    }
    if (idxCategory === -1) {
      return Response.json({ error: "CSV header is missing 'category'" }, { status: 400 });
    }

    const idxQuantity = headers.findIndex(h => h === "quantity" || h === "qty");
    const idxSerialNumber = headers.findIndex(h => h === "serialnumber" || h === "serial");
    const idxBodyName = headers.findIndex(h => h === "bodyname" || h === "body");
    const idxRespPerson = headers.findIndex(h => h === "respperson" || h === "responsible" || h === "person");
    const idxPurchaseDate = headers.findIndex(h => h === "purchasedate" || h === "date");
    const idxPurchaseFrom = headers.findIndex(h => h === "purchasefrom" || h === "vendor" || h === "supplier");
    const idxBillNumber = headers.findIndex(h => h === "billnumber" || h === "bill");
    const idxPurchasePrice = headers.findIndex(h => h === "purchaseprice" || h === "price" || h === "cost");
    const idxStatus = headers.findIndex(h => h === "status");
    const idxNotes = headers.findIndex(h => h === "notes" || h === "description");

    const validCategories = ["CAMERA", "VIDEO_MIXER", "VIDEO_RECORDER", "AUDIO_MIXER", "WIRELESS_TX", "UPS", "ACCESSORY"];
    const validStatuses = ["AVAILABLE", "IN_USE", "MAINTENANCE", "SOLD", "RETIRED"];

    const itemsToInsert: any[] = [];
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0) continue;

      const productName = row[idxProductName]?.trim();
      const rawCategory = row[idxCategory]?.trim().toUpperCase().replace(/ /g, "_");
      
      if (!productName) {
        errors.push(`Row ${i + 1}: Missing product name`);
        continue;
      }

      if (!rawCategory || !validCategories.includes(rawCategory)) {
        errors.push(`Row ${i + 1}: Invalid category '${row[idxCategory]}'. Must be one of: ${validCategories.join(", ")}`);
        continue;
      }

      const rawQuantity = idxQuantity !== -1 ? row[idxQuantity] : "1";
      const quantity = parseInt(rawQuantity, 10);
      if (isNaN(quantity) || quantity <= 0) {
        errors.push(`Row ${i + 1}: Invalid quantity '${rawQuantity}'`);
        continue;
      }

      const serialNumber = idxSerialNumber !== -1 ? row[idxSerialNumber] || null : null;
      const bodyName = idxBodyName !== -1 ? row[idxBodyName] || null : null;
      const respPerson = idxRespPerson !== -1 ? row[idxRespPerson] || null : null;
      const purchaseDate = idxPurchaseDate !== -1 ? row[idxPurchaseDate] || null : null;
      const purchaseFrom = idxPurchaseFrom !== -1 ? row[idxPurchaseFrom] || null : null;
      const billNumber = idxBillNumber !== -1 ? row[idxBillNumber] || null : null;
      
      const rawPrice = idxPurchasePrice !== -1 ? row[idxPurchasePrice] : null;
      const purchasePrice = rawPrice ? parseFloat(rawPrice) : null;

      let status = idxStatus !== -1 ? row[idxStatus]?.trim().toUpperCase() : "AVAILABLE";
      if (!validStatuses.includes(status)) {
        status = "AVAILABLE";
      }

      const notes = idxNotes !== -1 ? row[idxNotes] || null : null;

      itemsToInsert.push({
        productName,
        category: rawCategory,
        quantity,
        serialNumber,
        bodyName,
        respPerson,
        purchaseDate,
        purchaseFrom,
        billNumber,
        purchasePrice,
        status,
        notes
      });
    }

    if (errors.length > 0) {
      return Response.json({ error: "Validation failed", details: errors }, { status: 400 });
    }

    // Run import inside a single SQLite transaction
    const insertTransaction = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO equipment (
          product_name, category, quantity, serial_number, body_name,
          resp_person, purchase_date, purchase_from, bill_number, purchase_price,
          status, notes, created_at
        ) VALUES (
          @productName, @category, @quantity, @serialNumber, @bodyName,
          @respPerson, @purchaseDate, @purchaseFrom, @billNumber, @purchasePrice,
          @status, @notes, datetime('now')
        )
      `);

      for (const item of itemsToInsert) {
        stmt.run(item);
      }
    });

    insertTransaction();

    return Response.json({ success: true, count: itemsToInsert.length });
  } catch (err) {
    console.error("[POST /api/equipment/import-csv]", err);
    return Response.json({ error: "Failed to parse or import CSV data" }, { status: 500 });
  }
}
