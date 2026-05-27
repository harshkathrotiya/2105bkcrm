import type { NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  // Clear cookie by setting expiration to the past
  const cookieString = `bk-media-session=; HttpOnly; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; Secure=${process.env.NODE_ENV === "production" ? "true" : "false"}`;

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieString,
    },
  });
}
