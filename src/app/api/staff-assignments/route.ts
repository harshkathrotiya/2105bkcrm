import type { NextRequest } from "next/server";
import { getStaffAssignments, assignStaff, deleteAssignment } from "@/lib/queries/staff";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const inquiryId = searchParams.get("inquiryId");

    if (!inquiryId) {
      return Response.json({ error: "inquiryId is required" }, { status: 400 });
    }

    const assignments = getStaffAssignments(inquiryId);
    return Response.json(assignments);
  } catch (err) {
    console.error("[GET /api/staff-assignments]", err);
    return Response.json({ error: "Failed to fetch staff assignments" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.inquiryId) {
      return Response.json({ error: "inquiryId is required" }, { status: 400 });
    }
    if (!body.staffId) {
      return Response.json({ error: "staffId is required" }, { status: 400 });
    }
    if (body.daysAssigned === undefined) {
      return Response.json({ error: "daysAssigned is required" }, { status: 400 });
    }
    if (body.ratePerDay === undefined) {
      return Response.json({ error: "ratePerDay is required" }, { status: 400 });
    }

    const assignment = assignStaff({
      staffId: parseInt(body.staffId, 10),
      inquiryId: body.inquiryId,
      positionNo: body.positionNo ? parseInt(body.positionNo, 10) : null,
      positionName: body.positionName || null,
      daysAssigned: parseInt(body.daysAssigned, 10),
      ratePerDay: parseFloat(body.ratePerDay),
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
    const deleted = deleteAssignment(id);
    if (!deleted) {
      return Response.json({ error: "Assignment not found" }, { status: 404 });
    }

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/staff-assignments]", err);
    return Response.json({ error: "Failed to delete staff assignment" }, { status: 500 });
  }
}
