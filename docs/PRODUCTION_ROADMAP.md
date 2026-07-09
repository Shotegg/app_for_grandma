# Production Roadmap

This roadmap moves the app from the local in-memory Node MVP to a persistent Supabase backend with real Viber and Messenger delivery.

## Phase 1: Persistent Supabase Backend

Goal: make Supabase the source of truth for contacts, messages, read state, and voice audio.

1. Create and seed database tables for contacts, channel mappings, messages, and read state.
2. Create the private `voice` storage bucket used by the API function.
3. Decide the API access model for the mobile app:
   - short-term MVP: public Edge Function plus a shared app token header,
   - better production path: Supabase Auth with a restricted family/admin user model.
4. Point Flutter at the Supabase `api` Edge Function URL using `API_BASE_URL`.
5. Verify on a real Android device:
   - contacts load from Supabase,
   - voice uploads persist,
   - playback works after app/backend restart,
   - unread/read state persists.

## Phase 2: Contact Administration

Goal: stop editing code for contact names, photos, and channel IDs.

1. Store real contacts in the `contacts` table.
2. Store Messenger PSIDs and Viber subscriber IDs in `contact_channels`.
3. Add a small admin-only seed/update workflow.
4. Keep channel tokens only in Supabase secrets, never in Flutter.

## Phase 3: Messenger Integration

Goal: receive replies from Messenger and send grandma's messages to approved recipients.

1. Create/configure Meta app and Page.
2. Set Supabase secrets:
   - `MESSENGER_VERIFY_TOKEN`
   - `MESSENGER_PAGE_ACCESS_TOKEN`
   - `APP_SECRET`
3. Deploy `webhook-messenger`.
4. Register callback URL and verify token in Meta developer settings.
5. Capture each recipient PSID through an allowed Page/bot interaction and save it in `contact_channels`.
6. Test:
   - incoming text creates `incoming` message rows,
   - outgoing grandma voice transcript sends as Messenger text,
   - signature verification rejects invalid calls.

## Phase 4: Viber Integration

Goal: receive replies from Viber and send grandma's messages to subscribers.

1. Create/configure Viber bot.
2. Set Supabase secret `VIBER_BOT_TOKEN`.
3. Deploy `webhook-viber`.
4. Register the public webhook URL with Viber.
5. Capture each subscriber ID after the family member starts/subscribes to the bot and save it in `contact_channels`.
6. Add stronger Viber request validation before production exposure.
7. Test:
   - incoming Viber text creates `incoming` message rows,
   - outgoing grandma voice transcript sends as Viber text.

## Phase 5: Speech-to-Text and Delivery Reliability

Goal: make voice messages useful and traceable.

1. Set `OPENAI_API_KEY` in Supabase secrets.
2. Store transcript result and raw audio path for every outgoing message.
3. Add delivery status fields for channel sends.
4. Retry failed channel sends safely.
5. Show failures in the app instead of silently swallowing them.

## Phase 6: Security and Operations

Goal: make the service safe enough for a real family workflow.

1. Add API auth or a temporary app token gate.
2. Add rate limits per device/contact.
3. Audit secrets and remove local-only assumptions.
4. Add monitoring/logging for Edge Functions.
5. Document deploy, rollback, and backup steps.

## Current First Step

The first implementation step is Phase 1.1 and 1.2: seed contacts and create the private `voice` storage bucket in Supabase.
