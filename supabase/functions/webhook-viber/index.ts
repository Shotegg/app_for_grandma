import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const payload = await req.json().catch(() => ({}));
  if (payload?.event !== "message") {
    return new Response("ok", { status: 200 });
  }

  const senderId = payload?.sender?.id;
  const text = payload?.message?.text || "";
  if (!senderId || !text) {
    return new Response("ok", { status: 200 });
  }

  const { data: channelRow } = await supabase
    .from("contact_channels")
    .select("contact_id")
    .eq("channel", "viber")
    .eq("external_id", senderId)
    .maybeSingle();

  if (channelRow?.contact_id) {
    await supabase.from("messages").insert({
      contact_id: channelRow.contact_id,
      direction: "incoming",
      text,
      channel: "viber",
    });
  }

  return new Response("ok", { status: 200 });
});

