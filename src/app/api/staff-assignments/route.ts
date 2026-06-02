import type { NextRequest } from "next/server";
import { getStaffAssignments, assignStaff, deleteAssignment } from "@/lib/queries/staff";
import { Validator } from "@/lib/validate";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const inquiryId = searchParams.get("inquiryId");

    if (!inquiryId) {
      return Response.json({ error: "inquiryId is required" }, { status: 400 });
    }

    const assignments = await getStaffAssignments(inquiryId);
    return Response.json(assignments);
  } catch (err) {
    console.error("[GET /api/staff-assignments]", err);
    return Response.json({ error: "Failed to fetch staff assignments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const v = new Validator(body);
    v.required("inquiryId", "inquiry ID");
    v.required("staffId", "staff ID").positiveInteger("staffId", "staff ID");
    v.required("daysAssigned", "days assigned").positiveInteger("daysAssigned", "days assigned");
    v.required("ratePerDay", "rate per day").nonNegativeNumber("ratePerDay", "rate per day");
    if (body.positionNo !== undefined && body.positionNo !== null) v.positiveInteger("positionNo", "position number");
    if (body.positionName !== undefined && body.positionName) v.maxLength("positionName", 100, "position name");
    if (body.equipmentRatePerDay !== undefined && body.equipmentRatePerDay !== null && body.equipmentRatePerDay !== "") v.nonNegativeNumber("equipmentRatePerDay", "equipment rate per day");
    if (v.hasErrors()) return v.response();

    const assignment = await assignStaff({
      staffId: parseInt(body.staffId, 10),
      inquiryId: body.inquiryId,
      positionNo: body.positionNo ? parseInt(body.positionNo, 10) : null,
      positionName: body.positionName || null,
      daysAssigned: parseInt(body.daysAssigned, 10),
      ratePerDay: parseFloat(body.ratePerDay),
      withEquipment: body.withEquipment === true || body.withEquipment === "true" || body.withEquipment === 1,
      equipmentRatePerDay: body.equipmentRatePerDay !== undefined && body.equipmentRatePerDay !== null && body.equipmentRatePerDay !== "" ? parseFloat(body.equipmentRatePerDay) : 0,
      reportingTime: body.reportingTime || "09:00 AM",
    });

    return Response.json(assignment, { status: 201 });
  } catch (err) {
    console.error("[POST /api/staff-assignments]", err);
    return Response.json({ error: "Failed to create staff assignment" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const idStr = searchParams.get("id");

    if (!idStr) {
      return Response.json({ error: "id parameter is required" }, { status: 400 });
    }

    const id = parseInt(idStr, 10);
    if (isNaN(id) || id <= 0) {
      return Response.json({ error: "id must be a positive integer" }, { status: 400 });
    }

    const deleted = await deleteAssignment(id);
    if (!deleted) {
      return Response.json({ error: "Assignment not found" }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/staff-assignments]", err);
    return Response.json({ error: "Failed to delete staff assignment" }, { status: 500 });
  }
}
