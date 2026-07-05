import { config } from "../config.js";

const GRAPH_BASE = "https://graph.facebook.com/v22.0/me/messages";

export async function sendToMessenger({ psid, text }) {
  if (!config.messengerPageAccessToken || !psid) {
    return { skipped: true, reason: "Missing page token or psid." };
  }

  const res = await fetch(`${GRAPH_BASE}?access_token=${config.messengerPageAccessToken}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: psid },
      message: { text },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Messenger send failed: ${res.status} ${errorBody}`);
  }

  return { ok: true };
}

