'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Bot,
  MessageCircle,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Send,
  Trash2,
  User,
} from 'lucide-react'
import { ChatMessageMarkdown } from './chat-message-markdown'
import { cn } from './cn'
import type { ChatMessage } from './types'

const CHROME_ICON_BTN =
  'inline-flex size-10 shrink-0 items-center justify-center rounded-[0.5rem] border border-accent/35 bg-[oklch(0.42_0.11_42)] p-0 text-white transition-colors hover:border-accent/50 hover:bg-[oklch(0.5_0.13_42)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-40'

const AVATAR_TILE =
  'flex size-10 shrink-0 items-center justify-center rounded-[0.5rem] bg-[oklch(0.42_0.11_42)] text-white shadow-[0_2px_12px_-2px_oklch(0.72_0.19_41/0.45)]'

export type ResumeAssistantAriaLabels = {
  clear: string
  expandDocked: string
  expandFloating: string
  close: string
  send: string
}

export type ResumeAssistantProps = {
  /** Shown in the open panel header. */
  assistantTitle?: string
  /** Label on the floating trigger button. */
  triggerLabel?: string
  /** First assistant turn when chat is empty / cleared. */
  defaultWelcomeMessage?: string
  inputPlaceholder?: string
  apiPath?: string
  fetchOptions?: Omit<RequestInit, 'body' | 'method'>
  /** localStorage key for serialized messages. */
  storageKeyMessages?: string
  storageKeyExpanded?: string
  connectionErrorMessage?: string
  temperature?: number
  maxTokens?: number
  buildRequestBody?: (args: {
    messages: ChatMessage[]
    temperature: number
    maxTokens: number
  }) => Record<string, unknown>
  ariaLabels?: Partial<ResumeAssistantAriaLabels>
  classNames?: {
    fabContainer?: string
    triggerShell?: string
    dockedRoot?: string
    compactRoot?: string
    panelShell?: string
    panelInner?: string
  }
}

const defaultAria: ResumeAssistantAriaLabels = {
  clear: 'Clear chat',
  expandDocked: 'Use compact floating panel',
  expandFloating: 'Expand sidebar (right third of page)',
  close: 'Close assistant',
  send: 'Send',
}

function isChatMessageList(value: unknown): value is ChatMessage[] {
  if (!Array.isArray(value)) return false
  return value.every(
    (m) =>
      m &&
      typeof m === 'object' &&
      typeof (m as ChatMessage).content === 'string' &&
      ((m as ChatMessage).role === 'assistant' || (m as ChatMessage).role === 'user'),
  )
}

function parseStoredChatMessages(raw: string | null): ChatMessage[] | null {
  if (raw == null) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  try {
    const parsed: unknown = JSON.parse(trimmed)
    return isChatMessageList(parsed) ? parsed : null
  } catch {
    return null
  }
}

function welcomeMessage(content: string): ChatMessage {
  return { role: 'assistant', content }
}

export function ResumeAssistant({
  assistantTitle = 'Portfolio assistant',
  triggerLabel = 'Ask me',
  defaultWelcomeMessage = "Hi! I'm your portfolio assistant. Ask me about experience, projects, and skills.",
  inputPlaceholder = 'Ask a question…',
  apiPath = '/api/chat',
  fetchOptions,
  storageKeyMessages = 'portfolioAssistantMessages',
  storageKeyExpanded = 'portfolioAssistantExpanded',
  connectionErrorMessage = "⚠️ I'm having trouble connecting right now. Please try asking again!",
  temperature = 0.7,
  maxTokens = 1500,
  buildRequestBody,
  ariaLabels: ariaLabelsProp,
  classNames,
}: ResumeAssistantProps) {
  const aria = { ...defaultAria, ...ariaLabelsProp }
  const welcome = welcomeMessage(defaultWelcomeMessage)

  const chatboxRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [input, setInput] = useState('')

  const [messages, setMessages] = useState<ChatMessage[]>([welcome])

  useEffect(() => {
    const stored = parseStoredChatMessages(localStorage.getItem(storageKeyMessages))
    setMessages(stored ?? [welcome])
  }, [])

  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem(storageKeyMessages, JSON.stringify(messages))
    }
  }, [messages, storageKeyMessages])

  useEffect(() => {
    if (!isOpen) return
    try {
      setIsExpanded(localStorage.getItem(storageKeyExpanded) === '1')
    } catch {
      /* ignore */
    }
  }, [isOpen, storageKeyExpanded])

  function toggleExpanded() {
    setIsExpanded((prev) => {
      const next = !prev
      try {
        localStorage.setItem(storageKeyExpanded, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage: ChatMessage = {
      content: input,
      role: 'user',
    }

    setMessages((prevMessages) => [...prevMessages, userMessage])
    const newMessages = [...messages, userMessage]
    setInput('')
    setLoading(true)

    const bodyDefault = {
      messages: newMessages,
      temperature,
      max_tokens: maxTokens,
    }

    const body = buildRequestBody
      ? buildRequestBody({ messages: newMessages, temperature, maxTokens: maxTokens })
      : bodyDefault

    try {
      const res = await fetch(apiPath, {
        ...fetchOptions,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(fetchOptions?.headers ?? {}),
        },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        let assistantText = connectionErrorMessage
        try {
          const errBody = (await res.json()) as { message?: string }
          if (errBody.message) {
            assistantText = `⚠️ ${errBody.message}`
          }
        } catch {
          // non-JSON error body
        }
        setMessages([...newMessages, { role: 'assistant', content: assistantText }])
        setLoading(false)
        return
      }

      const apiMessage = (await res.json()) as { message: string }
      setMessages([...newMessages, { role: 'assistant', content: apiMessage.message }])
      setLoading(false)
    } catch (error) {
      console.error('Chat error:', error)
      setLoading(false)
      setMessages([...newMessages, { role: 'assistant', content: connectionErrorMessage }])
    }
  }

  useEffect(() => {
    if (chatboxRef.current) {
      chatboxRef.current.scrollTop = chatboxRef.current.scrollHeight
    }
  }, [messages, loading, isExpanded])

  if (!isOpen) {
    return (
      <div className={cn('fixed bottom-6 right-6 z-[120]', classNames?.fabContainer)}>
        <div
          className={cn(
            'resume-assistant-trigger-shell shadow-[0_8px_30px_-8px_oklch(0.72_0.19_41/0.35)]',
            classNames?.triggerShell,
          )}
        >
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group flex w-full items-center gap-2.5 rounded-[calc(0.75rem-2px)] border-0 bg-card px-7 py-4 font-mono text-sm font-semibold uppercase tracking-widest text-foreground transition-colors hover:bg-secondary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-8 sm:py-4 sm:text-base"
          >
            <MessageCircle className="h-5 w-5 shrink-0 text-accent sm:h-6 sm:w-6" aria-hidden />
            <span>{triggerLabel}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className={cn(
          'fixed isolate z-[120] overflow-hidden',
          isExpanded
            ? cn(
                'top-16 right-0 bottom-0 w-[clamp(18rem,33.333333vw,calc(100vw-0.75rem))] pb-[max(1rem,env(safe-area-inset-bottom))]',
                classNames?.dockedRoot,
              )
            : cn('bottom-6 right-6 w-[min(92vw,420px)]', classNames?.compactRoot),
        )}
      >
        <div
          className={cn(
            'resume-assistant-panel-shell',
            isExpanded && 'resume-assistant-panel-shell--dock-right h-full',
            classNames?.panelShell,
          )}
        >
          <div
            className={cn(
              'flex flex-col overflow-hidden rounded-[calc(0.75rem-2px)] bg-popover ring-1 ring-accent/25 shadow-[0_12px_40px_-14px_oklch(0.72_0.19_41/0.38),inset_0_1px_0_0_rgba(255,255,255,0.05)]',
              isExpanded
                ? 'h-full min-h-0 w-full rounded-l-[calc(0.75rem-2px)] rounded-r-none'
                : 'h-[min(60vh,520px)] w-full',
              classNames?.panelInner,
            )}
            data-lenis-prevent
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-accent/20 bg-background px-4 py-3 sm:px-5 sm:py-3.5">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-accent shadow-[0_0_12px_oklch(0.72_0.19_41/0.7)] sm:h-3 sm:w-3" />
                <h2 className="truncate font-mono text-sm font-semibold uppercase leading-10 tracking-[0.2em] text-foreground sm:text-[0.95rem]">
                  {assistantTitle}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setMessages([welcome])
                    localStorage.removeItem(storageKeyMessages)
                  }}
                  className={cn(CHROME_ICON_BTN)}
                  disabled={loading || messages.length <= 1}
                  aria-label={aria.clear}
                >
                  <Trash2 className="size-[1.25rem]" aria-hidden strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={toggleExpanded}
                  className={cn(CHROME_ICON_BTN)}
                  aria-label={isExpanded ? aria.expandDocked : aria.expandFloating}
                >
                  {isExpanded ? (
                    <PanelRightClose className="size-[1.25rem]" aria-hidden strokeWidth={2} />
                  ) : (
                    <PanelRightOpen className="size-[1.25rem]" aria-hidden strokeWidth={2} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={cn(CHROME_ICON_BTN)}
                  aria-label={aria.close}
                >
                  <Minimize2 className="size-[1.25rem]" aria-hidden strokeWidth={2} />
                </button>
              </div>
            </div>

            <div
              className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain bg-popover p-4 sm:p-5"
              ref={chatboxRef}
            >
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
                >
                  {message.role === 'assistant' ? (
                    <div className={cn(AVATAR_TILE)}>
                      <Bot className="size-5 shrink-0" aria-hidden strokeWidth={2} />
                    </div>
                  ) : null}
                  <div className={`min-w-0 flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                    <div
                      className={cn(
                        'inline-block max-w-full break-words border p-3 font-sans text-sm leading-relaxed',
                        message.role === 'user'
                          ? 'border-accent/30 bg-accent text-accent-foreground ring-1 ring-accent/40'
                          : 'border border-accent/25 border-l-2 border-l-accent bg-secondary text-foreground shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] sm:text-[0.9375rem]',
                      )}
                    >
                      <ChatMessageMarkdown content={message.content} variant={message.role} />
                    </div>
                  </div>
                  {message.role === 'user' ? (
                    <div className={cn(AVATAR_TILE)}>
                      <User className="size-5 shrink-0" aria-hidden strokeWidth={2} />
                    </div>
                  ) : null}
                </div>
              ))}

              {loading ? (
                <div className="flex flex-row items-center justify-start gap-3">
                  <div className={cn(AVATAR_TILE)}>
                    <Bot className="size-5 shrink-0" aria-hidden strokeWidth={2} />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-white/85" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-white/85 delay-150" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-white/85 delay-300" />
                  </div>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-accent/20 bg-background p-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={inputPlaceholder}
                  disabled={loading}
                  autoComplete="off"
                  aria-label={inputPlaceholder}
                  className="block flex-1 w-full rounded-none border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex size-12 shrink-0 items-center justify-center rounded-[0.5rem] border border-accent/35 bg-[oklch(0.42_0.11_42)] text-white shadow-[0_4px_20px_-6px_oklch(0.72_0.19_41/0.45)] transition-opacity hover:bg-[oklch(0.5_0.13_42)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={aria.send}
                >
                  <Send className="size-[1.25rem]" aria-hidden strokeWidth={2} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
