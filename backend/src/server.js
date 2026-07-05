import crypto from "node:crypto";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import multer from "multer";
import morgan from "morgan";

import { sendToMessenger } from "./channels/messenger.js";
import { sendToViber } from "./channels/viber.js";
import { config } from "./config.js";
import { transcribeAudio } from "./services/transcription.js";
import {
  addMessage,
  getContactById,
  listContacts,
  listMessages,
  markContactAsRead,
} from "./store.js";

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const audioStore = new Map();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(
  express.json({
    limit: "10mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.get("/contacts", (_req, res) => {
  res.json(listContacts());
});

app.get("/messages/:contactId", (req, res) => {
  const contact = getContactById(req.params.contactId);
  if (!contact) {
    return res.status(404).json({ error: "Contact not found" });
  }
  return res.json(listMessages(contact.id));
});

app.post("/contacts/:contactId/read", (req, res) => {
  const contact = getContactById(req.params.contactId);
  if (!contact) {
    return res.status(404).json({ error: "Contact not found" });
  }
  markContactAsRead(contact.id);
  return res.json({ ok: true });
});

app.get("/audio/:audioId", (req, res) => {
  const audio = audioStore.get(req.params.audioId);
  if (!audio) {
    return res.status(404).json({ error: "Audio not found" });
  }
  res.setHeader("Content-Type", audio.mimeType || "application/octet-stream");
  return res.send(audio.buffer);
});

app.post("/messages/:contactId/audio", upload.single("audio"), async (req, res) => {
  const contact = getContactById(req.params.contactId);
  if (!contact) {
    return res.status(404).json({ error: "Contact not found" });
  }

  const transcriptFromBody = String(req.body?.transcript || "").trim();
  const audioFile = req.file || null;
  if (!transcriptFromBody && !audioFile) {
    return res.status(400).json({ error: "Need transcript or audio" });
  }

  let transcript = transcriptFromBody;
  let storedAudioUrl = null;
  if (audioFile) {
    const audioId = crypto.randomUUID();
    audioStore.set(audioId, {
      buffer: audioFile.buffer,
      mimeType: audioFile.mimetype,
      createdAt: Date.now(),
    });
    storedAudioUrl = `${req.protocol}://${req.get("host")}/audio/${audioId}`;

    if (!transcript) {
      try {
        transcript = await transcribeAudio({
          audioBuffer: audioFile.buffer,
          fileName: audioFile.originalname || "voice.m4a",
          mimeType: audioFile.mimetype || "audio/m4a",
        });
      } catch (error) {
        console.error("Transcription error:", error);
      }
    }
  }

  const textForChannels = transcript || "Voice message";
  const outgoing = addMessage({
    contactId: contact.id,
    direction: "outgoing",
    text: transcript,
    audioUrl: storedAudioUrl,
    channel: "app",
  });

  try {
    const jobs = [];
    const messengerPsid = contact.channels?.messenger?.psid;
    const viberSubscriberId = contact.channels?.viber?.subscriberId;

    if (messengerPsid) {
      jobs.push(sendToMessenger({ psid: messengerPsid, text: textForChannels }));
    }
    if (viberSubscriberId) {
      jobs.push(sendToViber({ subscriberId: viberSubscriberId, text: textForChannels }));
    }

    if (jobs.length > 0) {
      await Promise.all(jobs);
    }

    return res.json({
      ok: true,
      message: outgoing,
      deliveredToChannels: jobs.length,
    });
  } catch (error) {
    return res.status(502).json({
      error: "Channel delivery failed",
      details: String(error),
    });
  }
});

app.get("/webhooks/messenger", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.messengerVerifyToken) {
    return res.status(200).send(String(challenge || ""));
  }
  return res.sendStatus(403);
});

app.post("/webhooks/messenger", (req, res) => {
  const signature = req.get("X-Hub-Signature-256");
  if (!verifyMetaSignature(signature, req)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];
  for (const entry of entries) {
    const events = Array.isArray(entry.messaging) ? entry.messaging : [];
    for (const event of events) {
      const senderId = event?.sender?.id;
      const text = event?.message?.text || "";
      if (!senderId || !text) {
        continue;
      }
      const contact = findContactByMessengerPsid(senderId);
      if (!contact) {
        continue;
      }
      addMessage({
        contactId: contact.id,
        direction: "incoming",
        text,
        channel: "messenger",
      });
    }
  }
  return res.sendStatus(200);
});

app.post("/webhooks/viber", (req, res) => {
  const event = req.body?.event;
  if (event !== "message") {
    return res.sendStatus(200);
  }
  const senderId = req.body?.sender?.id;
  const text = req.body?.message?.text || "";
  if (!senderId || !text) {
    return res.sendStatus(200);
  }

  const contact = findContactByViberSubscriberId(senderId);
  if (contact) {
    addMessage({
      contactId: contact.id,
      direction: "incoming",
      text,
      channel: "viber",
    });
  }
  return res.sendStatus(200);
});

function verifyMetaSignature(signatureHeader, req) {
  if (!config.appSecret) {
    return true;
  }
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }

  const incoming = signatureHeader.slice("sha256=".length);
  const payload = Buffer.from(req.rawBody || "");
  const expected = crypto
    .createHmac("sha256", config.appSecret)
    .update(payload)
    .digest("hex");

  if (incoming.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(incoming), Buffer.from(expected));
}

function findContactByMessengerPsid(psid) {
  return listContactsWithChannels().find((c) => c.channels?.messenger?.psid === psid);
}

function findContactByViberSubscriberId(subscriberId) {
  return listContactsWithChannels().find(
    (c) => c.channels?.viber?.subscriberId === subscriberId,
  );
}

function listContactsWithChannels() {
  // `listContacts` hides channels for the app, so we access source via `getContactById`.
  return listContacts().map((contact) => getContactById(contact.id)).filter(Boolean);
}

app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
});
