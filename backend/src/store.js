import { randomUUID } from "node:crypto";

import { config } from "./config.js";

const defaultContacts = [
  {
    id: "daughter",
    name: "Κόρη",
    avatarUrl:
      "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=500&q=80",
    channels: {},
  },
  {
    id: "grandson",
    name: "Εγγονός",
    avatarUrl:
      "https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&w=500&q=80",
    channels: {},
  },
];

const contacts = config.contacts.length > 0 ? config.contacts : defaultContacts;
const messagesByContact = new Map();
const lastReadByContact = new Map();

for (const contact of contacts) {
  messagesByContact.set(contact.id, []);
  lastReadByContact.set(contact.id, null);
}

export function listContacts() {
  return contacts.map(({ id, name, avatarUrl }) => {
    const messages = messagesByContact.get(id) ?? [];
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const lastReadAt = lastReadByContact.get(id);

    const unreadCount = messages.filter((msg) => {
      if (msg.direction !== "incoming") {
        return false;
      }
      if (!lastReadAt) {
        return true;
      }
      return new Date(msg.createdAt).getTime() > new Date(lastReadAt).getTime();
    }).length;

    return {
      id,
      name,
      avatarUrl,
      unreadCount,
      lastMessageText: lastMessage?.text || "",
      lastMessageAt: lastMessage?.createdAt || null,
    };
  });
}

export function getContactById(contactId) {
  return contacts.find((c) => c.id === contactId);
}

export function listMessages(contactId) {
  return messagesByContact.get(contactId) ?? [];
}

export function markContactAsRead(contactId) {
  const messages = messagesByContact.get(contactId) ?? [];
  if (messages.length === 0) {
    return;
  }
  lastReadByContact.set(contactId, new Date().toISOString());
}

export function addMessage({
  contactId,
  direction,
  text,
  audioUrl = null,
  channel = "app",
}) {
  const target = messagesByContact.get(contactId);
  if (!target) {
    return null;
  }

  const message = {
    id: randomUUID(),
    contactId,
    direction,
    text,
    audioUrl,
    channel,
    createdAt: new Date().toISOString(),
  };
  target.push(message);
  return message;
}
