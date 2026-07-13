// Paddle API + webhook helpers for edge functions (Deno).

const PADDLE_ENV = Deno.env.get("PADDLE_ENV") ?? "sandbox";
const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY") ?? "";

export const PADDLE_API_BASE =
  PADDLE_ENV === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";

export function paddleConfigured(): boolean {
  return PADDLE_API_KEY.length > 0;
}

export async function paddleFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return await fetch(`${PADDLE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${PADDLE_API_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

const encoder = new TextEncoder();

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Verify a Paddle webhook signature.
 * Header format: "ts=1671552777;h1=eb4d0dc8853be92b7f063b9f3ba5233eb920a09459b6e6b2c26705b4f288423b"
 * Signed payload: `${ts}:${rawBody}` with HMAC-SHA256 using the destination's secret key.
 */
export async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader || !secret) return false;

  const parts = new Map<string, string>();
  for (const piece of signatureHeader.split(";")) {
    const [k, v] = piece.split("=", 2);
    if (k && v) parts.set(k.trim(), v.trim());
  }
  const ts = parts.get("ts");
  const h1 = parts.get("h1");
  if (!ts || !h1) return false;

  // Reject replays outside a 5-minute window
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() / 1000 - tsNum) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"],
  );
  try {
    // crypto.subtle.verify is constant-time
    return await crypto.subtle.verify(
      "HMAC", key, hexToBytes(h1), encoder.encode(`${ts}:${rawBody}`),
    );
  } catch {
    return false;
  }
}
