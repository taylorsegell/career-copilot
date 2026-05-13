# Next.js Pages example — `portfolio-assistant`

1. Copy `.env.example` to `.env.local` and add a valid `ANTHROPIC_API_KEY`.
2. From the repo root: `pnpm dev` (or `pnpm --filter portfolio-assistant-example dev`).
3. Visit [http://localhost:3010](http://localhost:3010).

`pages/api/chat.ts` wires a static sandbox system prompt via `createAnthropicPagesHandler`. Replace that string with your own context pipeline before going to production.

The “Taylor Segell” profile is fictional and only exists to demo the OSS package.
