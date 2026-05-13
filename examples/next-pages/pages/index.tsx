'use client'

import { ResumeAssistant } from 'portfolio-assistant'

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-background px-6 py-16 pb-48">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 text-foreground">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-muted-foreground">
            portfolio-assistant
          </p>
          <h1 className="mt-4 font-mono text-3xl font-semibold uppercase tracking-[0.12em] sm:text-4xl">
            Example Next.js Pages app
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
            Add{' '}
            <code className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-xs">
              ANTHROPIC_API_KEY
            </code>{' '}
            to <span className="font-mono">.env.local</span>. Open the widget — replies are AI-generated and
            may be wrong.
          </p>
        </div>
      </div>
      <ResumeAssistant
        assistantTitle="Jamie Chen (demo)"
        triggerLabel="Ask demo"
        defaultWelcomeMessage={`Hi — I'm Jamie's demo assistant. Ask about ingestion design or how this widget wires to Claude behind /api/chat.`}
        inputPlaceholder="Ask the demo assistant something…"
        apiPath="/api/chat"
      />
    </main>
  )
}
