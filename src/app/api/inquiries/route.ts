/**
 * GET  /api/inquiries              — list all inquiries
 * GET  /api/inquiries?clientId=x   — filter by client
 * POST /api/inquiries              — create a new inquiry
 */

import type { NextRequest } from "next/server";
import {
  getAllInquiries,
  getInquiriesByClient,
  createInquiry,
} from "@/lib/queries/inquiries";
import { createCalendarEvent } from "@/lib/queries/calendar";
import { getClientById } from "@/lib/queries/clients";
import { generateId } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get("clientId");
    const inquiries = clientId
      ? getInquiriesByClient(clientId)
      : getAllInquiries();
    return Response.json(inquiries);
  } catch (err) {
    console.error("[GET /api/inquiries]", err);
    return Response.json({ error: "Failed to fetch inquiries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.clientId) {
      return Response.json({ error: "clientId is required" }, { status: 400 });
    }
    if (!body.eventType?.trim()) {
      return Response.json({ error: "eventType is required" }, { status: 400 });
    }
    if (!body.startDate || !body.endDate) {
      return Response.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }
    if (!body.venue?.trim()) {
      return Response.json({ error: "venue is required" }, { status: 400 });
    }

    const inquiry = createInquiry({
      id: body.id ?? `inq-${generateId()}`,
      clientId: body.clientId,
      eventType: body.eventType.trim(),
      startDate: body.startDate,
      endDate: body.endDate,
      startTime: body.startTime ?? "",
      endTime: body.endTime ?? "",
      venue: body.venue.trim(),
      notes: body.notes?.trim() ?? "",
      status: "New",
      createdAt: new Date().toISOString().split("T")[0],
    });

    // Auto-create calendar event for the start date
    const client = getClientById(body.clientId);
    const startD = new Date(body.startDate);
    createCalendarEvent({
      id: `cal-${generateId()}`,
      date: startD.getDate(),
      month: startD.getMonth(), // store 0-indexed (matching JS Date)
      year: startD.getFullYear(),
      label: client?.name ?? "Event",
      type: "inquiry",
    });

    return Response.json(inquiry, { status: 201 });
  } catch (err) {
    console.error("[POST /api/inquiries]", err);
    return Response.json(
      { error: "Failed to create inquiry" },
      { status: 500 }
    );
  }
}
