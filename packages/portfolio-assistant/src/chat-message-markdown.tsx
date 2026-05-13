'use client'

import type { ComponentProps } from 'react'
import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const defaultHeadingHeadingClass =
  'font-sans text-base font-semibold tracking-wide first:mt-0'

export type ChatMessageMarkdownProps = {
  content: string
  variant: 'assistant' | 'user'
  /** Applied to `#` / `##` / `###` surrogate headings (replacing consumer-specific display fonts). */
  headingClassName?: string
}

function createComponents(
  variant: 'assistant' | 'user',
  headingClassName: string,
): Components {
  const linkClass =
    variant === 'user'
      ? 'font-sans underline underline-offset-2 decoration-accent-foreground/70 hover:opacity-90'
      : 'font-sans text-accent underline underline-offset-2 decoration-accent/80 hover:opacity-90'

  return {
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    ul: ({ children }) => (
      <ul className="my-2 list-disc space-y-1 pl-4 [text-align:left]">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-2 list-decimal space-y-1 pl-4 [text-align:left]">{children}</ol>
    ),
    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
    a: ({ href, children }) => (
      <a href={href} className={linkClass} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    h1: ({ children }) => (
      <h3
        className={`mt-3 mb-1 border-b border-border pb-1 text-base first:mt-0 ${headingClassName}`}
      >
        {children}
      </h3>
    ),
    h2: ({ children }) => (
      <h3 className={`mt-3 mb-1 text-base ${headingClassName}`}>{children}</h3>
    ),
    h3: ({ children }) => (
      <h3 className={`mt-2 mb-1 text-sm ${headingClassName}`}>{children}</h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-2 border-l-2 border-accent pl-3 text-muted-foreground">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-3 border-border" />,
    table: ({ children }) => (
      <div className="my-2 max-w-full overflow-x-auto">
        <table className="w-full border-collapse border border-border text-left text-xs">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-secondary/80">{children}</thead>,
    tbody: ({ children }) => <tbody>{children}</tbody>,
    tr: ({ children }) => <tr className="border-b border-border last:border-0">{children}</tr>,
    th: ({ children }) => (
      <th className="border border-border px-2 py-1.5 font-mono font-semibold uppercase tracking-wide">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="border border-border px-2 py-1.5 align-top">{children}</td>
    ),
    code: ({ className, children, ...props }) => {
      const isBlock = typeof className === 'string' && className.includes('language-')
      if (isBlock) {
        return (
          <code
            className={`block font-mono text-[0.8rem] leading-relaxed text-foreground ${className ?? ''}`}
            {...props}
          >
            {children}
          </code>
        )
      }
      return (
        <code className="rounded bg-background/60 px-1 py-0.5 font-mono text-[0.8rem]" {...props}>
          {children}
        </code>
      )
    },
    pre: ({ children }) => (
      <pre className="my-2 max-h-48 max-w-full overflow-auto rounded border border-border bg-background/50 p-2">
        {children}
      </pre>
    ),
  }
}

export function ChatMessageMarkdown({
  content,
  variant,
  headingClassName = defaultHeadingHeadingClass,
}: ChatMessageMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm] as ComponentProps<typeof ReactMarkdown>['remarkPlugins']}
      components={createComponents(variant, headingClassName)}
    >
      {content}
    </ReactMarkdown>
  )
}
