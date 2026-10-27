# AgriFlow

Mobile-first EVS app for farmers to log seeds, capture weather, and get Groq AI recommendations for fertilizer timing and irrigation schedules to prevent agricultural runoff.

## Stack

- Next.js 14 (App Router)
- TypeScript (strict)
- Tailwind CSS (CDN)
- Capacitor 6 (Android/iOS)
- Convex (schema + actions)
- Open-Meteo (free weather API)
- Groq (LLM recommendations via `fetch`)

## Commands

```bash
npm install
npm run dev
npm run build
npm run lint

# Capacitor
npm run mobile:add:android
npm run mobile:add:ios
npm run mobile:sync
npm run mobile:open:android
npm run mobile:open:ios
```

## Structure

- `app/` — pages, layout, globals
- `components/ui/` — typed shadcn-style primitives (button, card, input, badge)
- `components/shared/` — feature cards (SeedCard, WeatherBadge, RecommendationCard)
- `lib/` — `utils.ts` (cn), `weather.ts` (Open-Meteo), `groq.ts` (Groq fetch client)
- `hooks/` — `useHaptic.ts`
- `convex/` — schema, seeds queries/mutations, recommendations action (Groq)

## Env

Copy `.env.example` to `.env.local` and fill `CONVEX_URL` and `NEXT_PUBLIC_GROQ_API_KEY`.
