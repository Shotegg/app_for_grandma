import "dotenv/config";

function parseContacts(raw) {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const config = {
  port: Number(process.env.PORT || 3000),
  appSecret: process.env.APP_SECRET || "",
  messengerVerifyToken: process.env.MESSENGER_VERIFY_TOKEN || "",
  messengerPageAccessToken: process.env.MESSENGER_PAGE_ACCESS_TOKEN || "",
  viberBotToken: process.env.VIBER_BOT_TOKEN || "",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  contacts: parseContacts(process.env.CONTACTS_JSON),
};

