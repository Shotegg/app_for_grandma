import { config } from "../config.js";

const VIBER_BASE = "https://chatapi.viber.com/pa/send_message";

export async function sendToViber({ subscriberId, text }) {
  if (!config.viberBotToken || !subscriberId) {
    return { skipped: true, reason: "Missing bot token or subscriber id." };
  }

  const res = await fetch(VIBER_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Viber-Auth-Token": config.viberBotToken,
    },
    body: JSON.stringify({
      receiver: subscriberId,
      min_api_version: 7,
      type: "text",
      text,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Viber send failed: ${res.status} ${errorBody}`);
  }

  return { ok: true };
}

