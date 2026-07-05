# Backend

Node/Express API για:

- contacts/messages API για το Flutter app
- outbound send σε Viber/Messenger bot channels
- inbound webhook handling

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

## Speech To Text

- Βάλε `OPENAI_API_KEY` στο `.env` για αυτόματο transcript.
- Αν δεν υπάρχει key, το μήνυμα αποθηκεύεται/προωθείται ως "Voice message" χωρίς transcript.

## Security Checklist (MVP+)

- Βάλε strong `APP_SECRET`.
- Βάλε `MESSENGER_VERIFY_TOKEN`.
- Μην εκθέτεις channel tokens στο mobile app.
- Κράτα `CONTACTS_JSON` allowlist με γνωστούς συγγενείς μόνο.
- Ενεργοποίησε HTTPS reverse proxy σε production.
