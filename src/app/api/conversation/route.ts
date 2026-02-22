import { getDb } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      conversationId,
      sessionId,
      transcript,
      customerName,
      customerPhone,
      customerEmail,
      vehicleInfo,
      serviceDescription,
      status,
    } = body;

    const sql = getDb();

    await sql`
      INSERT INTO conversations (
        id, session_id, customer_name, customer_phone, customer_email,
        vehicle_info, service_description, transcript, status,
        last_activity_at, updated_at
      ) VALUES (
        ${conversationId}, ${sessionId}, ${customerName || null},
        ${customerPhone || null}, ${customerEmail || null},
        ${vehicleInfo || null}, ${serviceDescription || null},
        ${JSON.stringify(transcript)}, ${status || "active"},
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        customer_name = COALESCE(${customerName || null}, conversations.customer_name),
        customer_phone = COALESCE(${customerPhone || null}, conversations.customer_phone),
        customer_email = COALESCE(${customerEmail || null}, conversations.customer_email),
        vehicle_info = COALESCE(${vehicleInfo || null}, conversations.vehicle_info),
        service_description = COALESCE(${serviceDescription || null}, conversations.service_description),
        transcript = ${JSON.stringify(transcript)},
        status = ${status || "active"},
        last_activity_at = NOW(),
        updated_at = NOW()
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Conversation save error:", error);
    return NextResponse.json(
      { error: "Failed to save conversation" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ conversation: null });
    }

    const sql = getDb();

    const rows = await sql`
      SELECT * FROM conversations
      WHERE session_id = ${sessionId}
        AND status = 'active'
        AND last_activity_at > NOW() - INTERVAL '24 hours'
      ORDER BY last_activity_at DESC
      LIMIT 1
    `;

    return NextResponse.json({ conversation: rows[0] || null });
  } catch (error) {
    console.error("Conversation fetch error:", error);
    return NextResponse.json({ conversation: null });
  }
}
