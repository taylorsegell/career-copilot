import type { NextApiRequest, NextApiResponse } from 'next'

/** Default model id aligned with Anthropic docs (verify in your dashboard). */
const DEFAULT_ANTHROPIC_MODEL = 'claude-haiku-4-5'
const DEFAULT_ANTHROPIC_VERSION = '2023-06-01'

export type ChatBody = {
  messages?: { role: string; content: string }[]
  model?: string
  temperature?: number
  max_tokens?: number
}

export type AnthropicMessage = { role: 'user' | 'assistant'; content: string }

/** Strip UI-only leading assistant turns; keep user/assistant only; merge consecutive same role. */
export function normalizeMessagesForAnthropic(
  raw: { role: string; content: string }[],
): AnthropicMessage[] {
  let start = 0
  while (start < raw.length && raw[start]?.role === 'assistant') {
    start++
  }

  const filtered: AnthropicMessage[] = []
  for (let i = start; i < raw.length; i++) {
    const m = raw[i]
    if (m.role !== 'user' && m.role !== 'assistant') continue
    const text = typeof m.content === 'string' ? m.content : ''
    filtered.push({ role: m.role, content: text })
  }

  const merged: AnthropicMessage[] = []
  for (const m of filtered) {
    const last = merged[merged.length - 1]
    if (last && last.role === m.role) {
      last.content = last.content ? `${last.content}\n\n${m.content}` : m.content
    } else {
      merged.push({ role: m.role, content: m.content })
    }
  }

  return merged
}

export function extractAnthropicErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  const o = body as { error?: { message?: string } | string; message?: string }
  if (typeof o.error === 'string') return o.error
  if (o.error && typeof o.error === 'object' && typeof o.error.message === 'string') {
    return o.error.message
  }
  if (typeof o.message === 'string') return o.message
  return undefined
}

export function extractAnthropicAssistantText(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  const content = (body as { content?: { type?: string; text?: string }[] }).content
  if (!Array.isArray(content)) return undefined
  const textBlock = content.find((b) => b?.type === 'text' && typeof b.text === 'string')
  return textBlock?.text
}

export type CreateAnthropicPagesHandlerOptions = {
  /**
   * System prompt for Claude. Resolve from Markdown, JSON, or DB — never bundle secrets here.
   * Receives the Next.js request when you need per-request logic (cookies, locales, etc.).
   */
  getSystemPrompt: (req: NextApiRequest) => string | Promise<string>
  defaultModel?: string
  anthropicVersion?: string
  /** Maximum allowed `max_tokens` from client (clamped upward to at least 1). Default 8192. */
  maxTokensCap?: number
  /** Override for tests or custom secret resolution (defaults to `process.env.ANTHROPIC_API_KEY`). */
  getApiKey?: () => string | undefined
}

/**
 * Pages Router API handler factory for Claude Messages API.
 * Consumers mount: `export default createAnthropicPagesHandler({ getSystemPrompt: ... })`
 */
export function createAnthropicPagesHandler({
  getSystemPrompt,
  defaultModel = DEFAULT_ANTHROPIC_MODEL,
  anthropicVersion = DEFAULT_ANTHROPIC_VERSION,
  maxTokensCap = 8192,
  getApiKey = () => process.env.ANTHROPIC_API_KEY,
}: CreateAnthropicPagesHandlerOptions): (
  req: NextApiRequest,
  res: NextApiResponse,
) => Promise<void> {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' })
    }

    const { messages, model, temperature = 0.7, max_tokens = 1500 } = req.body as ChatBody

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: 'Messages array is required' })
    }

    const apiKey = getApiKey()
    if (!apiKey) {
      return res.status(500).json({ message: 'Anthropic API key not configured' })
    }

    const anthropicMessages = normalizeMessagesForAnthropic(messages)

    if (anthropicMessages.length === 0) {
      return res.status(400).json({ message: 'No valid messages to send after normalization' })
    }

    if (anthropicMessages[0].role !== 'user') {
      return res.status(400).json({
        message: 'Conversation must start with a user message for the assistant API',
      })
    }

    const resolvedModel = model?.trim() || defaultModel
    const resolvedMaxTokens = Math.min(Math.max(1, max_tokens || 1500), maxTokensCap)

    let system: string
    try {
      system = await getSystemPrompt(req)
      if (!system || typeof system !== 'string') {
        return res.status(500).json({ message: 'System prompt resolver returned invalid value' })
      }
    } catch (e) {
      console.error('getSystemPrompt error:', e)
      return res.status(500).json({ message: 'Failed to resolve system prompt' })
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': anthropicVersion,
        },
        body: JSON.stringify({
          model: resolvedModel,
          max_tokens: resolvedMaxTokens,
          system,
          messages: anthropicMessages,
          temperature: temperature ?? 0.7,
        }),
      })

      const responseBody: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        const detail = extractAnthropicErrorMessage(responseBody)

        if (response.status === 401) {
          return res.status(401).json({
            message: detail ?? 'Invalid or missing Anthropic API key',
          })
        }

        if (response.status === 429) {
          return res.status(429).json({
            message: detail ?? 'Anthropic API rate limit exceeded',
          })
        }

        if (response.status === 400) {
          return res.status(400).json({
            message: detail ?? 'Invalid request to Anthropic API',
          })
        }

        if (response.status === 404) {
          return res.status(400).json({
            message:
              detail ??
              'Model not found. Check the model id (see Anthropic models docs) or your API access.',
          })
        }

        console.error('Anthropic API non-success', response.status, responseBody)

        return res.status(502).json({
          message:
            detail ?? `Anthropic returned an error (${response.status}). Try again in a moment.`,
        })
      }

      const message = extractAnthropicAssistantText(responseBody)
      if (!message) {
        return res.status(500).json({ message: 'No response from Anthropic' })
      }

      const usage = (responseBody as { usage?: unknown; model?: string }).usage
      const respModel = (responseBody as { model?: string }).model

      res.status(200).json({
        message,
        usage,
        model: respModel ?? resolvedModel,
      })
    } catch (error) {
      console.error('Anthropic API error:', error)
      const msg = error instanceof Error ? error.message : 'Internal server error'
      res.status(500).json({ message: msg })
    }
  }
}
