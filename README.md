# Grandma Voice Messenger

MVP για απλή επικοινωνία μιας ηλικιωμένης χρήστριας με λίγες επαφές, με ροή:

1. Επιλογή επαφής από μεγάλο "catalog" UI.
2. Ηχογράφηση φωνητικού.
3. Αποστολή φωνητικού + transcript.
4. Παράδοση μηνύματος μέσω καναλιών bot (Viber/Messenger) από backend.

## Repo Structure

- `apps/grandma_flutter`: Flutter app για τη γιαγιά.
- `backend`: API + webhook handlers + adapters για Viber/Messenger.
- `docs/ROADMAP.md`: πρακτικό πλάνο υλοποίησης.
- `docs/CHANNELS_MVP.md`: βήματα σύνδεσης με Viber/Messenger.

## Current Status

- Flutter app skeleton με:
  - Home με contact cards.
  - Last message preview + unread badge.
  - Chat view με ιστορικό.
  - Auto-refresh chat + manual refresh.
  - Push-to-talk UI state (mocked recording state).
  - Play/Stop για συνημμένα voice μηνύματα.
  - API integration για contacts/messages/send.
- Backend skeleton με:
  - `GET /contacts`
  - `GET /messages/:contactId`
  - `POST /messages/:contactId/audio`
  - `POST /webhooks/viber`
  - `GET|POST /webhooks/messenger`
  - Allowlist παραληπτών + βασικά security hooks.

## Quick Start

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Flutter

```bash
cd apps/grandma_flutter
flutter pub get
flutter run
```

## Notes

- Το Flutter CLI δεν ολοκλήρωσε scaffold αυτόματα στο τρέχον περιβάλλον, οπότε δημιουργήθηκε χειροκίνητο skeleton.
- Πριν production χρειάζονται:
  - πραγματικό audio recording,
  - production auth,
  - persistent DB/storage,
  - πλήρες policy compliance για Viber/Meta.
