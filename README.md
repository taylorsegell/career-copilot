# Career Copilot / `portfolio-assistant`

Open-source split of a floating “Ask …” portfolio widget and a small **Anthropic Messages** adapter for **Next.js Pages Router**.

![/assets/images/career-copilot.png](/assets/images/career-copilot.png)

- **Workspace package:** [`packages/portfolio-assistant`](packages/portfolio-assistant) (publishable as npm `portfolio-assistant` or rename the `name` field before release).
- **Demo app:** [`examples/next-pages`](examples/next-pages).

## Quick start (monorepo)

```bash
pnpm install
pnpm build
pnpm dev
```

Then open [http://localhost:3010](http://localhost:3010) and add `ANTHROPIC_API_KEY` to `examples/next-pages/.env.local` (see `examples/next-pages/.env.example`). The demo uses a **fictional** profile (“Taylor Segell”) so no real résumé data ships in this repo.

**pnpm 11:** the first `pnpm install` on a machine may require allowing dependency build scripts (e.g. `esbuild`, `sharp`). If install errors with `ERR_PNPM_IGNORED_BUILDS`, run `pnpm approve-builds --all` once in this repo (the allowlist is persisted in the lockfile).

## Toolchain (current)

Monorepo pins **`packageManager: pnpm@11.1.1`** ([Corepack](https://nodejs.org/api/corepack.html) recommended). Published library peers target **Next ≥15** / **React ≥18** while the example runs **Next 16**, **React 19**, **Tailwind CSS 4.3**, **TypeScript 5.9**, **ESLint 9** (flat config via `eslint-config-next`), **remark-gfm 4**, and **lucide-react 1.x**.

---

The widget `POST`s JSON to `apiPath` (default `/api/chat`). Your route should match this shape so the UI stays backend-agnostic.

### Request body

| Field | Type | Notes |
|--------|------|--------|
| `messages` | `{ role: string, content: string }[]` | Required. UI may include a leading assistant greeting; the server handler strips leading assistant turns before calling Anthropic. |
| `temperature` | number | Optional. |
| `max_tokens` | number | Optional; server clamps to a configurable cap (default 8192). |
| `model` | string | Optional Claude model id (see Anthropic docs). |

### Success response

`200` with JSON:

```json
{
  "message": "Plain text assistant reply (Markdown allowed in the UI).",
  "model": "resolved-or-requested-model-id",
  "usage": {}
}
```

`usage` is forwarded from Anthropic when present; treat it as opaque / optional.

### Error response

Non-OK status with JSON `{ "message": string }` suitable to show in the UI.

---

## Adopting in your Next.js app

### 1. Install

From npm (after you publish) or via `file:` / `workspace:` in a monorepo.

Peer dependencies (install in the app): `react`, `react-dom`, `next`, `clsx`, `tailwind-merge`, `lucide-react`, `react-markdown`, `remark-gfm`.

### 2. Configure Next

```ts
// next.config.ts
import type { NextConfig } from 'next'

export default {
  transpilePackages: ['portfolio-assistant'],
} satisfies NextConfig
```

### 3. Styles (Tailwind + shell)

1. Import Tailwind in your global CSS (Tailwind v4 pattern as in the example).
2. Map **CSS variables** similar to shadcn tokens: `background`, `foreground`, `card`, `popover`, `secondary`, `muted-foreground`, `accent`, `accent-foreground`, `border`, `ring`, etc. The example lists a minimal dark + orange set in `examples/next-pages/styles/globals.css`.
3. Add **`@source`** (or equivalent content paths) so Tailwind scans `node_modules/portfolio-assistant/dist/**/*` **or** your local `packages/.../src/**/*.tsx` — class names must be discoverable by the compiler.
4. Import the animated shell:

```css
@import 'portfolio-assistant/styles.css';
```

### 4. Pages API route

**Never** expose `ANTHROPIC_API_KEY` to the browser. Resolve it only inside the API route (or server utilities it calls).

```ts
// pages/api/chat.ts
import type { NextApiRequest } from 'next'
import { createAnthropicPagesHandler } from 'portfolio-assistant/server'

const SYSTEM = `You are …` // load from Markdown, CMS, or git at build time — your data, your responsibility

export default createAnthropicPagesHandler({
  getSystemPrompt: async (req: NextApiRequest) => {
    void req // use for locale, RBAC, etc. when needed
    return SYSTEM
  },
})
```

`getSystemPrompt` may be `async` and can read files, databases, or `req`-derived context. **The published package imports no tenant data.**

### 5. Client widget

Use a Client Component subtree:

```tsx
'use client'

import { ResumeAssistant } from 'portfolio-assistant'

export function Assistant() {
  return (
    <ResumeAssistant
      assistantTitle="Alex Rivera"
      triggerLabel="Ask Alex"
      defaultWelcomeMessage="Hi! Ask me about my work."
      storageKeyMessages="alexPortfolioChat"
      storageKeyExpanded="alexPortfolioAssistantExpanded"
    />
  )
}
```

Props cover labels, storage keys, `apiPath`, `temperature` / `maxTokens`, optional `fetchOptions`, `ariaLabels`, `buildRequestBody`, and `classNames` overrides — see exported types.

---

## Security and operations

| Topic | Recommendation |
|---------|----------------|
| Secrets | Keep `ANTHROPIC_API_KEY` on the server only (env vars, secret manager). Never reference it from client bundles. |
| Abuse | Layer rate limits (edge middleware, your host’s controls, upstream quotas). The handler already bounds `max_tokens`. |
| Output quality | Assistants hallucinate — disclose that near the widget or in system prompts for public sites. |
| Compliance | MIT licensed; AI outputs carry no fitness warranty — see [`LICENSE`](LICENSE). |

---

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm build` | Build library + demo |
| `pnpm dev` | Run `examples/next-pages` dev server (port **3010** in that package’s script) |
| `pnpm lint` | Type-check `portfolio-assistant` + `eslint .` in the example (**`next lint` was removed in Next 16** — the demo uses flat `eslint.config.mjs`) |

---

## Reference implementation

Parity with Taylor’s production site [**portfolio-tjs**](https://github.com/taylorsegell/portfolio-tjs) (`ResumeAssistant`, `pages/api/chat`) was preserved while extracting; **this OSS repo does not modify that codebase.**
