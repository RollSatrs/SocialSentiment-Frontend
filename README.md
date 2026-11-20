# SocialSentiment — Frontend

Next.js 16 / React 19 / TypeScript / Tailwind CSS.

## Run
```bash
pnpm install
pnpm dev
```
Open http://localhost:4000. The Java backend must be running on http://localhost:4001.

Optional: set `NEXT_PUBLIC_API_URL` to override the backend URL.

## Features
- Instagram post / Reel URL form
- Optional manual import of real comments, one per line
- Negative / neutral / positive breakdown and filters
- Recent analyses from PostgreSQL via Java API
- Honest `COLLECTOR_NOT_CONNECTED` state when no comments are available

**Current limitation:** automatic Instagram collection is not connected. The current sentiment classifier is a dictionary heuristic, not an AI model.

Backend and coursework docs: https://github.com/RollSatrs/SocialSentiment-Backend

## Checks
```bash
pnpm lint
pnpm build
```
