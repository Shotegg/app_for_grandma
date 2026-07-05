import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const verifyToken = Deno.env.get("MESSENGER_VERIFY_TOKEN") || "";
const appSecret = Deno.env.get("APP_SECRET") || "";

const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === verifyToken) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const rawBody = await req.text();
  if (!(await verifyMetaSignature(req.headers.get("X-Hub-Signature-256"), rawBody, appSecret))) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = JSON.parse(rawBody);
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];

  for (const entry of entries) {
    const events = Array.isArray(entry?.messaging) ? entry.messaging : [];
    for (const event of events) {
      const senderId = event?.sender?.id;
      const text = event?.message?.text || "";
      if (!senderId || !text) {
        continue;
      }

      const { data: channelRow } = await supabase
        .from("contact_channels")
        .select("contact_id")
        .eq("channel", "messenger")
        .eq("external_id", senderId)
        .maybeSingle();
      if (!channelRow?.contact_id) {
        continue;
      }

      await supabase.from("messages").insert({
        contact_id: channelRow.contact_id,
        direction: "incoming",
        text,
        channel: "messenger",
      });
    }
  }

  return new Response("EVENT_RECEIVED", { status: 200 });
});

async function verifyMetaSignature(signatureHeader: string | null, rawBody: string, secret: string) {
  if (!secret) {
    return true;
  }
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const incoming = signatureHeader.slice("sha256=".length);
  const expected = await hmacSha256Hex(secret, rawBody);
  return incoming === expected;
}

async function hmacSha256Hex(secret: string, message: string) {
  const keyData = new TextEncoder().encode(secret);
  const msgData = new TextEncoder().encode(message);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, msgData);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
