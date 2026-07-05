# Viber/Messenger MVP Setup

Το backend ήδη υποστηρίζει αποστολή προς Viber/Messenger όταν υπάρχει mapping επαφής.

## 1) Configure `.env`

Στο `backend/.env`:

```env
MESSENGER_VERIFY_TOKEN=your_verify_token
MESSENGER_PAGE_ACCESS_TOKEN=your_page_access_token
VIBER_BOT_TOKEN=your_viber_bot_token
APP_SECRET=your_meta_app_secret
```

## 2) Add contact channel IDs

Στο `CONTACTS_JSON` βάλε τα IDs για κάθε συγγενή:

```json
[
  {
    "id": "daughter",
    "name": "Κόρη",
    "avatarUrl": "https://example.com/daughter.jpg",
    "channels": {
      "messenger": { "psid": "1234567890" }
    }
  },
  {
    "id": "grandson",
    "name": "Εγγονός",
    "avatarUrl": "https://example.com/grandson.jpg",
    "channels": {
      "viber": { "subscriberId": "abcdefg" }
    }
  }
]
```

## 3) Webhooks

- Messenger verify callback:
  - `GET /webhooks/messenger`
- Messenger incoming events:
  - `POST /webhooks/messenger`
- Viber incoming events:
  - `POST /webhooks/viber`

Σύνδεσε αυτά τα URLs σε public HTTPS endpoint (π.χ. ngrok/cloudflare tunnel).

## 4) How MVP behaves

1. Η γιαγιά στέλνει voice από app.
2. Backend κάνει STT (αν υπάρχει `OPENAI_API_KEY`).
3. Backend προωθεί text σε Viber/Messenger για το contact που έχει mapping.
4. Απαντήσεις από webhook γράφονται στο chat.

## 5) Important limitations

- Messenger: απαιτεί business/Page flow και policy window.
- Viber: απαιτεί bot subscriber flow.
- Δεν στέλνει σε προσωπικά chats χωρίς τα επίσημα bot/page constraints.

