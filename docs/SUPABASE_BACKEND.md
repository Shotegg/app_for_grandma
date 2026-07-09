# Supabase Backend Runbook

Use this when moving the Flutter app from the local Node backend to Supabase Edge Functions.

## Local Supabase

From the repo root:

```powershell
npx supabase start
npx supabase db reset
```

The reset applies migrations and then runs `supabase/seed.sql`.

Expected local outputs from `npx supabase start` include:

- API URL
- anon key
- service role key
- Studio URL

Keep service role keys out of Flutter and out of git.

## Local API Function

The API function expects these tables and storage resources:

- `contacts`
- `contact_channels`
- `messages`
- `read_state`
- private storage bucket `voice`

The migrations explicitly grant table access to `service_role` for Edge Functions and revoke direct table access from `anon` and `authenticated`. The Flutter app should call Edge Functions, not the database tables directly.

The Flutter `API_BASE_URL` should point to the Edge Function URL, not the database REST URL.

Typical local function URL:

```text
http://127.0.0.1:54321/functions/v1/api
```

If the function keeps `verify_jwt = true`, Flutter must send a valid Supabase JWT. The current Flutter client does not do that yet.

Short-term MVP options:

1. Set `functions.api.verify_jwt = false` and add a custom shared app token check in `supabase/functions/api/index.ts`.
2. Add Supabase Auth to Flutter and keep `verify_jwt = true`.

Prefer option 2 for production. Option 1 is faster for a family-only MVP, but it must not rely on secrets embedded in a public client long term.

## Deploy

After linking the Supabase project:

```powershell
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase functions deploy api
npx supabase functions deploy webhook-messenger
npx supabase functions deploy webhook-viber
```

Set secrets in Supabase, not in Flutter:

```powershell
npx supabase secrets set OPENAI_API_KEY=...
npx supabase secrets set MESSENGER_VERIFY_TOKEN=...
npx supabase secrets set MESSENGER_PAGE_ACCESS_TOKEN=...
npx supabase secrets set APP_SECRET=...
npx supabase secrets set VIBER_BOT_TOKEN=...
```

## Flutter Against Supabase

Once the API access model is chosen, run Flutter with:

```powershell
flutter run --dart-define=API_BASE_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/api
```

The current `ApiClient` only sends plain HTTP requests. If Supabase JWT or an app token is required, update `apps/grandma_flutter/lib/services/api_client.dart`.

## Channel Webhook URLs

After deploying functions:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/webhook-messenger
https://YOUR_PROJECT_REF.supabase.co/functions/v1/webhook-viber
```

Messenger uses a verify token plus request signature verification. Viber still needs stronger validation before production use.
