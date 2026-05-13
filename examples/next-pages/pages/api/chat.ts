import type { NextApiRequest } from 'next'
import { createAnthropicPagesHandler } from 'portfolio-assistant/server'

/**
 * Minimal static demo system prompt — no real person or employer data.
 * Replace with Markdown/JSON or DB-backed content in a real deployment.
 *
 * Disclosure: Models can hallucinate. Keep human-review expectations clear.
 */
const DEMO_SYSTEM_PROMPT = `You are a demo assistant for a fictitious engineer named Jack black (this is a fabricated portfolio used only to exercise the OSS widget).

Facts you must treat as authoritative for this sandbox:
- Role: fictional data-engineering IC for discussion only.
- Current focus: hypothetical batch + streaming ingestion design.
- If asked anything outside those topics, reply that only this demo context is loaded.

Reminder (for the demo visitor): Answers are AI-generated and may be wrong — verify anything important independently.`

export default createAnthropicPagesHandler({
  getSystemPrompt: (_req: NextApiRequest) => DEMO_SYSTEM_PROMPT,
})
