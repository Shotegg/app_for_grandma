import { config } from "../config.js";

const OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";

export async function transcribeAudio({
  audioBuffer,
  fileName = "voice.m4a",
  mimeType = "audio/m4a",
}) {
  if (!config.openAiApiKey) {
    return "";
  }

  const form = new FormData();
  const blob = new Blob([audioBuffer], { type: mimeType });
  form.append("file", blob, fileName);
  form.append("model", "whisper-1");
  form.append("language", "el");

  const res = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openAiApiKey}`,
    },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Transcription failed: ${res.status} ${body}`);
  }

  const data = await res.json();
  return String(data.text || "").trim();
}

