const encoder = new TextEncoder();

if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
  console.warn("Warning: NEXTAUTH_SECRET environment variable is not set.");
}

const secret = process.env.NEXTAUTH_SECRET || "bk-media-crm-default-jwt-secret-key-123456";
const subtle = globalThis.crypto.subtle;

export interface SessionPayload {
  userId: string;
  username: string;
  name: string;
  role: string;
  permissions?: string[];
  exp?: number;
}

async function getCryptoKey(): Promise<CryptoKey> {
  return subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

export async function signJWT(payload: Omit<SessionPayload, "exp">, expiresInSec = 86400): Promise<string> {
  const key = await getCryptoKey();
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const exp = Math.floor(Date.now() / 1000) + expiresInSec;
  const encodedPayload = base64UrlEncode(JSON.stringify({ ...payload, exp }));
  
  const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const signatureBuffer = await subtle.sign("HMAC", key, data);
  const signature = Buffer.from(signatureBuffer)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
    
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export async function verifyJWT(token: string): Promise<SessionPayload | null> {
  try {
    const [headerB64, payloadB64, signature] = token.split(".");
    if (!headerB64 || !payloadB64 || !signature) return null;
    
    const key = await getCryptoKey();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    
    // Decode base64url signature to array buffer
    let sigBase64 = signature.replace(/-/g, "+").replace(/_/g, "/");
    while (sigBase64.length % 4) sigBase64 += "=";
    const sigBytes = Buffer.from(sigBase64, "base64");
    
    const isValid = await subtle.verify("HMAC", key, sigBytes, data);
    if (!isValid) return null;
    
    const payload = JSON.parse(base64UrlDecode(payloadB64));
    
    if (payload.exp && Date.now() / 1000 > payload.exp) {
      return null;
    }
    
    return payload;
  } catch (err) {
    console.error("verifyJWT error:", err);
    return null;
  }
}
