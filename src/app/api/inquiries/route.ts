/**
 * GET  /api/inquiries             — list all inquiries
 * GET  /api/inquiries?clientId=x  — filter by client
 * POST /api/inquiries             — create a new inquiry
 */

import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/role-permissions";
import {
  getAllInquiries,
  getInquiriesByClient,
  createInquiry,
} from "@/lib/queries/inquiries";
import { createCalendarEvent } from "@/lib/queries/calendar";
import { getClientById } from "@/lib/queries/clients";
import { generateId } from "@/lib/types";
import { Validator, INQUIRY_STATUSES } from "@/lib/validate";

export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get("clientId");
    const inquiries = clientId
      ? await getInquiriesByClient(clientId)
      : await getAllInquiries();
    return Response.json(inquiries);
  } catch (err) {
    console.error("[GET /api/inquiries]", err);
    return Response.json({ error: "Failed to fetch inquiries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission(request, "inquiries.create");
    if (!auth.ok) return auth.response!;

    const body = await request.json();

    const v = new Validator(body);
    v.required("clientId", "client");
    v.required("eventType", "event type").minLength("eventType", 2).maxLength("eventType", 100);
    v.required("startDate", "start date").date("startDate", "start date");
    v.required("endDate", "end date").date("endDate", "end date");
    v.dateRange("startDate", "endDate");
    v.required("venue").minLength("venue", 2).maxLength("venue", 200);
    v.maxLength("notes", 1000);
    if (v.hasErrors()) return v.response();

    // Verify client exists
    const client = await getClientById(body.clientId);
    if (!client) {
      return Response.json({ error: "Client not found" }, { status: 404 });
    }

    const inquiry = await createInquiry({
      id: body.id ?? `inq-${generateId()}`,
      clientId: body.clientId,
      eventType: body.eventType.trim(),
      eventName: body.eventName?.trim() || body.eventType.trim(),
      startDate: body.startDate,
      endDate: body.endDate,
      startTime: body.startTime ?? "",
      endTime: body.endTime ?? "",
      venue: body.venue.trim(),
      notes: body.notes?.trim() ?? "",
      status: "New",
      createdAt: new Date().toISOString().split("T")[0],
      department: body.department ?? "VIDEO",
      screenWidth: body.screenWidth ? parseFloat(body.screenWidth) : undefined,
      screenHeight: body.screenHeight ? parseFloat(body.screenHeight) : undefined,
      screenAreaSqft: body.screenAreaSqft ? parseFloat(body.screenAreaSqft) : undefined,
      totalCabinets: body.totalCabinets ? parseInt(body.totalCabinets, 10) : undefined,
      ledType: body.ledType ?? undefined,
      ratePerSqft: body.ratePerSqft ? parseFloat(body.ratePerSqft) : undefined,
      location: body.location ?? "INDOOR",
      stageType: body.stageType ?? undefined,
      dispatchDate: body.dispatchDate ?? undefined,
      dispatchTime: body.dispatchTime ?? undefined,
      vehicle1Number: body.vehicle1Number ?? undefined,
      vehicle1Driver: body.vehicle1Driver ?? undefined,
      vehicle2Number: body.vehicle2Number ?? undefined,
      vehicle2Driver: body.vehicle2Driver ?? undefined,
    });

    // Auto-create calendar event for the start date
    const startD = new Date(body.startDate);
    await createCalendarEvent({
      id: `cal-${generateId()}`,
      date: startD.getDate(),
      month: startD.getMonth(),
      year: startD.getFullYear(),
      label: client.name,
      type: "inquiry",
    });

    return Response.json(inquiry, { status: 201 });
  } catch (err) {
    console.error("[POST /api/inquiries]", err);
    return Response.json({ error: "Failed to create inquiry" }, { status: 500 });
  }
}
