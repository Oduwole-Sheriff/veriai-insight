# VeriAI Live Upgrade Plan

Keep every existing visual (colors, layout, gauge, cards, badges). Rewire the engine, add features around it.

## 1. Backend enablement
- Enable Lovable Cloud (Supabase) — needed to host server functions with secrets.
- Provision `LOVABLE_API_KEY` (Gemini via Lovable AI Gateway).
- Request `TAVILY_API_KEY` via secure secret form.

## 2. Service abstraction (`src/services/`)
- `searchProvider.ts` — `SearchProvider` interface + `TavilySearchProvider`. Easy to swap for SerpAPI/Bing later.
- `aiProvider.ts` — `AIProvider` interface + `LovableAIProvider` wrapping the gateway (Gemini 3.6 Flash by default). Supports `extractClaims`, `verifyClaim`.
- Trust-score ranker: `.gov/.edu/official-docs → 90-100`, academic journals `80-89`, Wikipedia/standards `65-79`, forums/blogs `<55`.

## 3. Server functions (`src/lib/veriai/*.functions.ts`)
- `extractClaims({ text })` — Lovable AI structured output → `Claim[]` (raw statements).
- `verifyClaim({ claim })` — call Tavily → rank sources → Lovable AI reasoning pass returning `{ status, confidence, agreement, contradiction, reasoning, sources[] }`. Statuses: `Verified | Contradicted | Partially Supported | Unable to Verify`.
- `verifyContent({ text })` — orchestrates extract → parallel verify (with concurrency cap) → aggregate overall hallucination score.
- All secrets read inside handlers. Errors surface typed fallbacks; local `sources.json` used only when Tavily returns `[]` or errors.

## 4. Types + engine
- Extend `types.ts` with new statuses, `reasoning`, `agreement`, `contradiction`, `publisher`, `publishedAt`, `trustScore`, `favicon`.
- Delete keyword-matching from `engine.ts`; keep a thin `fallbackVerify()` for offline mode using existing JSON.

## 5. Hook rewrite
- `useVerification` calls the server function; drives real progress phases: `extracting → researching → reasoning → done`. Existing progress bar labels update to match.

## 6. UI additions (drop-in, same visual language)
- **AI Reasoning Panel** — collapsible section inside each claim row on desktop / card on mobile, showing the model's short justification. Same border/background tokens as existing cards.
- **Source card upgrades** — favicon (Google s2), publisher, date, trust score chip, plus dropdown with "Visit", "Copy Reference", "Cite as APA/IEEE/MLA/Harvard/Chicago".
- **Citation generator** (`src/lib/veriai/citations.ts`) — pure functions per style.
- **History drawer** — button in header opens a sheet listing localStorage entries (search, delete, reopen). Uses existing button + card styling.
- **Export menu** — button in results header → JSON, CSV, Markdown, PDF (jsPDF). All client-side.

## 7. Storage
- `src/lib/veriai/history.ts` — typed localStorage wrapper (list, get, save, delete, search). Cap 50 entries.

## 8. Quality
- Retry with backoff in server fns (max 2 retries on Tavily 429/5xx).
- TanStack Query caches verifications by hash(text).
- Error boundary around `ResultsView`.

## 9. Pre-existing build failure
`server.node.js` imports `./dist/server/index.js` but the Vite build emits a Cloudflare Worker bundle, so `npm run build` fails today independent of my changes. I'll leave it alone unless you want it fixed — Lovable's own preview/publish uses the Cloudflare bundle and works fine; only the `render.yaml` Node deployment is affected.

## Files touched (~18)
New: `src/services/{searchProvider,aiProvider,trustRank}.ts`, `src/lib/veriai/{extractClaims,verifyClaim,verifyContent}.functions.ts`, `src/lib/ai-gateway.server.ts`, `src/lib/veriai/{citations,history,export,fallback}.ts`, `src/components/Dashboard/{ReasoningPanel,HistoryDrawer,ExportMenu,CitationMenu}.tsx`.
Modified: `types.ts`, `engine.ts` (thin fallback only), `useVerification.ts`, `SourceCard.tsx`, `ClaimRow.tsx`, `ResultsView.tsx`, `Header.tsx`, `Dashboard.tsx`, `VerifyingState.tsx`.

Approve and I'll ship it in one pass.
