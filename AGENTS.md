# Project Notes for Agents

Read this file first, then inspect only the files relevant to the current task. Do not edit files you have not read. The repo is a small MVP monorepo for a "Grandma Voice Messenger" app.

## Structure

- `apps/grandma_flutter/`: Flutter client. Main entry: `lib/main.dart`.
- `backend/`: local Node/Express MVP backend. Main entry: `src/server.js`.
- `supabase/`: Supabase config, migrations, and Edge Functions for a persistent backend path.
- `docs/`: roadmap and Viber/Messenger setup notes.

## Current Runtime Path

The app currently runs against the local Node backend by default.

- Backend command:
  - `cd backend`
  - `npm install`
  - `npm run dev`
- Flutter command:
  - `cd apps/grandma_flutter`
  - `flutter pub get`
  - `flutter run`
- For Windows desktop or Chrome, pass:
  - `flutter run --dart-define=API_BASE_URL=http://localhost:3000`
- For Android emulator, the default `http://10.0.2.2:3000` in `lib/main.dart` is intended.

## Important Files

- Flutter API client: `apps/grandma_flutter/lib/services/api_client.dart`
- Flutter home screen: `apps/grandma_flutter/lib/screens/home_screen.dart`
- Flutter chat/record/playback screen: `apps/grandma_flutter/lib/screens/chat_screen.dart`
- Contact card UI: `apps/grandma_flutter/lib/widgets/contact_card.dart`
- Local backend routes: `backend/src/server.js`
- Local backend contact/message store: `backend/src/store.js`
- Local backend env parsing: `backend/src/config.js`
- Supabase API function: `supabase/functions/api/index.ts`
- Supabase DB schema: `supabase/migrations/20260418141541_init_schema.sql`
- Supabase function config: `supabase/config.toml`
- Production roadmap: `docs/PRODUCTION_ROADMAP.md`
- Supabase backend runbook: `docs/SUPABASE_BACKEND.md`

## Contacts

In local Node mode, default contacts live in `backend/src/store.js`.

Production/custom contacts can be supplied with `CONTACTS_JSON` in `backend/.env`; parsing is in `backend/src/config.js`. Expected fields:

```json
[
  {
    "id": "daughter",
    "name": "Κόρη",
    "avatarUrl": "https://example.com/daughter.jpg",
    "channels": {
      "messenger": { "psid": "123" },
      "viber": { "subscriberId": "abc" }
    }
  }
]
```

In Supabase mode, contacts live in the `contacts` table (`id`, `name`, `avatar_url`) and channel IDs live in `contact_channels`.

## Known State

- Node backend stores messages and uploaded audio in memory. Restarting backend clears them.
- Supabase path is present but the Flutter app is not yet fully switched to Supabase auth/functions.
- Supabase webhook functions are public in `supabase/config.toml` (`verify_jwt = false`) because Meta/Viber callbacks do not send Supabase JWTs.
- Messenger webhook has signature verification. Viber webhook still needs stronger production validation.
- Android emulator may record silent audio if host microphone is not enabled; test on a real Android device when debugging recording.
- `flutter analyze` should be run from `apps/grandma_flutter/` after Flutter edits.
- Node syntax can be checked with `node --check backend/src/server.js` and similar files.

## Git / Safety

- Do not commit `node_modules/`, `.env`, Flutter `build/`, or `supabase/.temp/`.
- `supabase/.temp/` is local Supabase state and is ignored.
- If the working tree is dirty, inspect `git status --short` before edits and do not overwrite unrelated user changes.
- Keep fixes scoped. Prefer the existing simple MVP structure unless the task explicitly asks for a larger refactor.
