import type { NextRequest } from "next/server";
import { getOptions, addOption, removeOption, updateOption, type OptionType } from "@/lib/queries/options";
import { Validator } from "@/lib/validate";
import { requirePermission } from "@/lib/role-permissions";

const VALID_TYPES: OptionType[] = ["STAFF_ROLE", "QUOTATION_POSITION", "EQUIPMENT_CATEGORY", "EVENT_TYPE", "PAYMENT_METHOD"];

function isValidType(t: string | null): t is OptionType {
  return t !== null && VALID_TYPES.includes(t as OptionType);
}

// GET /api/options?type=STAFF_ROLE — list options for a type (auto-seeds defaults)
export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get("type");
    if (!isValidType(type)) {
      return Response.json({ error: "Invalid type. Must be one of: STAFF_ROLE, QUOTATION_POSITION, EQUIPMENT_CATEGORY, EVENT_TYPE, PAYMENT_METHOD" }, { status: 400 });
    }
    const options = await getOptions(type);
    return Response.json(options);
  } catch (err) {
    console.error("[GET /api/options]", err);
    return Response.json({ error: "Failed to fetch options" }, { status: 500 });
  }
}

// POST /api/options — add a custom option { type, value, equip?, rate? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!isValidType(body.type)) {
      return Response.json({ error: "Invalid type. Must be one of: STAFF_ROLE, QUOTATION_POSITION, EQUIPMENT_CATEGORY, EVENT_TYPE, PAYMENT_METHOD" }, { status: 400 });
    }

    // Adding a dropdown option requires edit access to the owning module,
    // so inline "add custom value" flows keep working for Managers.
    const permByType: Record<string, "staff.edit" | "quotations.edit" | "equipment.edit" | "inquiries.edit" | "invoices.edit"> = {
      STAFF_ROLE: "staff.edit",
      QUOTATION_POSITION: "quotations.edit",
      EQUIPMENT_CATEGORY: "equipment.edit",
      EVENT_TYPE: "inquiries.edit",
      PAYMENT_METHOD: "invoices.edit",
    };
    const auth = await requirePermission(request, permByType[body.type as string] ?? "settings.users");
    if (!auth.ok) return auth.response!;

    const v = new Validator(body);
    v.required("value").minLength("value", 1).maxLength("value", 100);
    if (body.rate !== undefined && body.rate !== null && body.rate !== "") v.nonNegativeNumber("rate");
    if (v.hasErrors()) return v.response();

    const option = await addOption(body.type, String(body.value).trim(), {
      equip: body.equip?.trim() || null,
      rate: body.rate !== undefined && body.rate !== null && body.rate !== "" ? parseFloat(body.rate) : null,
    });
    return Response.json(option, { status: 201 });
  } catch (err) {
    console.error("[POST /api/options]", err);
    return Response.json({ error: "Failed to add option" }, { status: 500 });
  }
}

// PUT /api/options — update an existing option { type, oldValue, newValue }
export async function PUT(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "settings.users");
    if (!auth.ok) return auth.response!;

    const body = await request.json();
    if (!isValidType(body.type)) {
      return Response.json({ error: "Invalid type. Must be one of: STAFF_ROLE, QUOTATION_POSITION, EQUIPMENT_CATEGORY, EVENT_TYPE, PAYMENT_METHOD" }, { status: 400 });
    }

    const v = new Validator(body);
    v.required("oldValue").minLength("oldValue", 1).maxLength("oldValue", 100);
    v.required("newValue").minLength("newValue", 1).maxLength("newValue", 100);
    if (v.hasErrors()) return v.response();

    const ok = await updateOption(body.type, String(body.oldValue).trim(), String(body.newValue).trim());
    if (!ok) return Response.json({ error: "Failed to update option or option value already exists" }, { status: 400 });
    return Response.json({ success: true });
  } catch (err) {
    console.error("[PUT /api/options]", err);
    return Response.json({ error: "Failed to update option" }, { status: 500 });
  }
}

// DELETE /api/options?type=STAFF_ROLE&value=... — soft-remove a custom option
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "settings.users");
    if (!auth.ok) return auth.response!;

    const type = request.nextUrl.searchParams.get("type");
    const value = request.nextUrl.searchParams.get("value");
    if (!isValidType(type)) {
      return Response.json({ error: "Invalid type. Must be one of: STAFF_ROLE, QUOTATION_POSITION, EQUIPMENT_CATEGORY, EVENT_TYPE, PAYMENT_METHOD" }, { status: 400 });
    }
    if (!value) {
      return Response.json({ error: "value is required" }, { status: 400 });
    }
    const ok = await removeOption(type, value);
    if (!ok) return Response.json({ error: "Option not found" }, { status: 404 });
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/options]", err);
    return Response.json({ error: "Failed to remove option" }, { status: 500 });
  }
}
