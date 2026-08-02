# VeriAI

AI hallucination detection dashboard. Paste an AI-generated answer, VeriAI extracts atomic
claims, researches them against live web sources, and scores each claim's support.

The app is **fully portable**: no project IDs, hosts, or API keys are hardcoded. Everything is
configured through environment variables, so it runs identically on localhost, Render, Vercel,
and Netlify.

## 1. Environment variables

Copy `.env.example` to `.env` and fill in what you need.

| Variable | Where | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | client | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | client | Your Supabase publishable (anon) key |
| `VITE_VERIFY_ENDPOINT` | client | Optional. Full URL of your deployed Edge Function. Empty = use the app's own same-origin server function |
| `TAVILY_API_KEY` | server / Edge Function | Search provider key |
| `VITE_TAVILY_API_KEY` | client | Only if you intentionally expose it to the browser |
| `AI_PROVIDER` | server | `openai`, `gemini`, or `custom` (auto-detected when omitted) |
| `OPENAI_API_KEY` / `GEMINI_API_KEY` | server | AI provider key (pick one) |
| `AI_BASE_URL` + `AI_API_KEY` | server | Any OpenAI-compatible gateway |
| `AI_MODEL` | server | Model override (`gpt-4o-mini` / `gemini-2.0-flash` by default) |
| `VITE_ENABLE_OFFLINE_MODE` | client | `true` enables the offline heuristic fallback (off by default) |

## 2. Supabase setup

1. Create a project at <https://supabase.com>.
2. Project Settings → API: copy the **Project URL** and **publishable/anon key**.
3. Put them in `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

The client lives in `src/lib/supabase.ts` and reads *only* those two variables. If they are
missing, `getSupabaseClient()` returns `null` and the app keeps working — Supabase is optional.

## 3. Tavily setup

1. Create an API key at <https://tavily.com>.
2. Local/server: add `TAVILY_API_KEY` to `.env`.
3. Edge Function: `supabase secrets set TAVILY_API_KEY=tvly-...`

If the key is missing, verification fails fast (no hanging, no crash) with:

> Live verification is unavailable because no search provider is configured.

## 4. OpenAI / Gemini setup

Set exactly one of:

```bash
OPENAI_API_KEY=sk-...        # uses https://api.openai.com/v1
GEMINI_API_KEY=...           # uses Gemini's OpenAI-compatible endpoint
AI_BASE_URL=https://your-gateway/v1
AI_API_KEY=...
```

Missing keys produce:

> Live verification is unavailable because no AI provider is configured.

## 5. Edge Function deployment

The verification pipeline is mirrored as a Deno Edge Function at
`supabase/functions/verify/index.ts`.

```bash
npm i -g supabase
supabase login
supabase link --project-ref <your-project-ref>

supabase secrets set TAVILY_API_KEY=tvly-... OPENAI_API_KEY=sk-...
supabase functions deploy verify --no-verify-jwt
```

Then point the frontend at it:

```bash
VITE_VERIFY_ENDPOINT=https://<your-project-ref>.supabase.co/functions/v1/verify
```

Leave `VITE_VERIFY_ENDPOINT` empty to use the built-in same-origin server function instead.

## 6. Local development

```bash
npm install
cp .env.example .env   # fill in your keys
npm run dev            # http://localhost:8080
npm run build          # production build
```

The dev server binds to all hosts with permissive `allowedHosts`, so tunnels and platform
preview domains (Render/Vercel/Netlify) work with no config changes.

## 7. Offline mode

The legacy keyword-based Computer-Science-only engine is disabled by default. Enable it
explicitly with `VITE_ENABLE_OFFLINE_MODE=true` (or `localStorage.veriai.offlineMode = "true"`)
if you want heuristic results when live verification is unavailable.
