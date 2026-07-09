import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type DbMessage = {
  id: string;
  contact_id: string;
  direction: "incoming" | "outgoing";
  text: string;
  audio_path: string | null;
  channel: string;
  created_at: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const openAiApiKey = Deno.env.get("OPENAI_API_KEY") || "";
const messengerPageAccessToken = Deno.env.get("MESSENGER_PAGE_ACCESS_TOKEN") || "";
const viberBotToken = Deno.env.get("VIBER_BOT_TOKEN") || "";

const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const routePath = stripFunctionPrefix(url.pathname, "api");

    if (req.method === "GET" && routePath === "/contacts") {
      return await handleGetContacts();
    }

    if (req.method === "GET" && routePath.startsWith("/messages/")) {
      const contactId = routePath.replace("/messages/", "").trim();
      return await handleGetMessages(contactId);
    }

    if (req.method === "POST" && routePath.startsWith("/contacts/") && routePath.endsWith("/read")) {
      const contactId = routePath.replace("/contacts/", "").replace("/read", "").trim();
      return await handleMarkRead(contactId);
    }

    if (req.method === "POST" && routePath.startsWith("/messages/") && routePath.endsWith("/audio")) {
      const contactId = routePath.replace("/messages/", "").replace("/audio", "").trim();
      return await handleSendAudio(req, contactId);
    }

    return json({ error: "Not found" }, 404);
  } catch (error) {
    return json({ error: "Internal error", details: String(error) }, 500);
  }
});

function stripFunctionPrefix(pathname: string, fnName: string) {
  const parts = pathname.split("/").filter(Boolean);
  const fnIndex = parts.indexOf(fnName);
  if (fnIndex === -1) {
    return pathname;
  }
  const remainder = parts.slice(fnIndex + 1).join("/");
  return `/${remainder}`;
}

async function handleGetContacts() {
  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select("id,name,avatar_url")
    .order("created_at", { ascending: true });
  if (contactsError) {
    return json({ error: contactsError.message }, 500);
  }

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("contact_id,direction,text,created_at")
    .order("created_at", { ascending: true });
  if (messagesError) {
    return json({ error: messagesError.message }, 500);
  }

  const { data: readState, error: readError } = await supabase
    .from("read_state")
    .select("contact_id,last_read_at");
  if (readError) {
    return json({ error: readError.message }, 500);
  }

  const byContact = new Map<string, Array<{ direction: string; text: string; created_at: string }>>();
  for (const msg of messages ?? []) {
    const arr = byContact.get(msg.contact_id) ?? [];
    arr.push(msg);
    byContact.set(msg.contact_id, arr);
  }

  const readMap = new Map<string, string | null>();
  for (const row of readState ?? []) {
    readMap.set(row.contact_id, row.last_read_at);
  }

  const response = (contacts ?? []).map((contact) => {
    const all = byContact.get(contact.id) ?? [];
    const last = all.length ? all[all.length - 1] : null;
    const lastReadAt = readMap.get(contact.id);
    const unreadCount = all.filter((m) => {
      if (m.direction !== "incoming") {
        return false;
      }
      if (!lastReadAt) {
        return true;
      }
      return new Date(m.created_at).getTime() > new Date(lastReadAt).getTime();
    }).length;

    return {
      id: contact.id,
      name: contact.name,
      avatarUrl: contact.avatar_url,
      unreadCount,
      lastMessageText: last?.text ?? "",
      lastMessageAt: last?.created_at ?? null,
    };
  });

  return json(response, 200);
}

async function handleGetMessages(contactId: string) {
  if (!contactId) {
    return json({ error: "Missing contact id" }, 400);
  }

  const { data: messages, error } = await supabase
    .from("messages")
    .select("id,contact_id,direction,text,audio_path,channel,created_at")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: true });
  if (error) {
    return json({ error: error.message }, 500);
  }

  const mapped = await Promise.all(
    (messages as DbMessage[]).map(async (m) => {
      let audioUrl: string | null = null;
      if (m.audio_path) {
        const { data } = await supabase.storage.from("voice").createSignedUrl(m.audio_path, 60 * 60);
        audioUrl = data?.signedUrl ?? null;
      }
      return {
        id: m.id,
        contactId: m.contact_id,
        direction: m.direction,
        text: m.text ?? "",
        audioUrl,
        createdAt: m.created_at,
      };
    }),
  );

  return json(mapped, 200);
}

async function handleMarkRead(contactId: string) {
  if (!contactId) {
    return json({ error: "Missing contact id" }, 400);
  }
  const { error } = await supabase
    .from("read_state")
    .upsert({ contact_id: contactId, last_read_at: new Date().toISOString() }, { onConflict: "contact_id" });
  if (error) {
    return json({ error: error.message }, 500);
  }
  return json({ ok: true }, 200);
}

async function handleSendAudio(req: Request, contactId: string) {
  if (!contactId) {
    return json({ error: "Missing contact id" }, 400);
  }

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .maybeSingle();
  if (contactError) {
    return json({ error: contactError.message }, 500);
  }
  if (!contact) {
    return json({ error: "Contact not found" }, 404);
  }

  let transcript = "";
  let audioPath: string | null = null;

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    transcript = String(form.get("transcript") ?? "").trim();
    const file = form.get("audio");
    if (file instanceof File && file.size > 0) {
      const mimeType = normalizeAudioMime(file.type);
      const ext = extensionFromMime(mimeType);
      audioPath = `${contactId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("voice")
        .upload(audioPath, file, { contentType: mimeType, upsert: false });
      if (uploadError) {
        return json({ error: uploadError.message }, 500);
      }

      if (!transcript && openAiApiKey) {
        transcript = await transcribeWithOpenAi(file);
      }
    }
  } else {
    const body = await req.json().catch(() => ({}));
    transcript = String(body?.transcript ?? "").trim();
  }

  if (!transcript && !audioPath) {
    return json({ error: "Need transcript or audio" }, 400);
  }

  const textForChannel = transcript || "Voice message";

  const { data: inserted, error: insertError } = await supabase
    .from("messages")
    .insert({
      contact_id: contactId,
      direction: "outgoing",
      text: transcript,
      audio_path: audioPath,
      channel: "app",
    })
    .select("id,contact_id,direction,text,audio_path,created_at")
    .single();
  if (insertError) {
    return json({ error: insertError.message }, 500);
  }

  const { data: channels, error: channelsError } = await supabase
    .from("contact_channels")
    .select("channel,external_id")
    .eq("contact_id", contactId);
  if (channelsError) {
    return json({ error: channelsError.message }, 500);
  }

  for (const ch of channels ?? []) {
    if (ch.channel === "messenger") {
      await sendToMessenger(ch.external_id, textForChannel);
    } else if (ch.channel === "viber") {
      await sendToViber(ch.external_id, textForChannel);
    }
  }

  let audioUrl: string | null = null;
  if (inserted.audio_path) {
    const { data } = await supabase.storage.from("voice").createSignedUrl(inserted.audio_path, 60 * 60);
    audioUrl = data?.signedUrl ?? null;
  }

  return json(
    {
      ok: true,
      message: {
        id: inserted.id,
        contactId: inserted.contact_id,
        direction: inserted.direction,
        text: inserted.text,
        audioUrl,
        createdAt: inserted.created_at,
      },
      deliveredToChannels: (channels ?? []).length,
    },
    200,
  );
}

function normalizeAudioMime(mime: string) {
  if (!mime || mime === "application/octet-stream") {
    return "audio/m4a";
  }
  if (mime === "video/mp4") {
    return "audio/mp4";
  }
  return mime;
}

function extensionFromMime(mime: string) {
  if (mime.includes("wav")) {
    return "wav";
  }
  if (mime.includes("mpeg")) {
    return "mp3";
  }
  if (mime.includes("ogg")) {
    return "ogg";
  }
  return "m4a";
}

async function transcribeWithOpenAi(file: File) {
  const form = new FormData();
  form.append("file", file);
  form.append("model", "whisper-1");
  form.append("language", "el");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiApiKey}` },
    body: form,
  });
  if (!res.ok) {
    return "";
  }
  const data = await res.json();
  return String(data?.text ?? "").trim();
}

async function sendToMessenger(psid: string, text: string) {
  if (!messengerPageAccessToken || !psid) {
    return;
  }
  await fetch(`https://graph.facebook.com/v22.0/me/messages?access_token=${messengerPageAccessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text },
    }),
  });
}

async function sendToViber(subscriberId: string, text: string) {
  if (!viberBotToken || !subscriberId) {
    return;
  }
  await fetch("https://chatapi.viber.com/pa/send_message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Viber-Auth-Token": viberBotToken,
    },
    body: JSON.stringify({
      receiver: subscriberId,
      min_api_version: 7,
      type: "text",
      text,
    }),
  });
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
