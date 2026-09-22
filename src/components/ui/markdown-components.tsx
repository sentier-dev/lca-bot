'use client'

import type { Components } from 'react-markdown'

/** Shared className for the Markdown wrapper div. */
export const MARKDOWN_WRAPPER_CLASS =
  'max-w-none min-w-0 break-words [overflow-wrap:anywhere] [&_.katex-display]:overflow-x-auto [&_.katex-display]:py-1'

/** Only these protocols reach the DOM; anything else renders as plain text. */
const SAFE_HREF = /^(https?:\/\/|mailto:|\/(?!\/)|#)/i

export const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="font-headline text-3xl font-bold text-on-surface mt-6 mb-4 first:mt-0 not-italic leading-tight">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-headline text-2xl font-semibold text-primary mt-6 mb-3 first:mt-0 not-italic leading-tight border-b border-outline-variant/40 pb-1">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-headline text-xl font-semibold text-on-surface mt-5 mb-2 first:mt-0 not-italic leading-snug">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="font-headline text-lg font-semibold text-on-surface mt-4 mb-2 first:mt-0 not-italic">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="font-body text-base not-italic leading-relaxed text-on-surface my-3 first:mt-0 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-on-surface">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => (
    <ul className="font-body text-base not-italic list-disc pl-6 my-3 space-y-1 text-on-surface">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="font-body text-base not-italic list-decimal pl-6 my-3 space-y-1 text-on-surface">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/40 pl-4 italic text-on-surface-variant my-3">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith('language-')
    if (isBlock) {
      return (
        <code className="block bg-surface-container p-3 rounded-md text-sm font-mono whitespace-pre-wrap break-words">
          {children}
        </code>
      )
    }
    return (
      <code className="bg-surface-container px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="bg-surface-container p-3 rounded-md overflow-x-auto my-3 text-sm not-italic">
      {children}
    </pre>
  ),
  hr: () => <hr className="my-6 border-outline-variant/40" />,
  a: ({ children, href }) => {
    const safe = typeof href === 'string' && SAFE_HREF.test(href) ? href : undefined
    return safe
      ? (
        <a href={safe} className="text-primary underline underline-offset-2 hover:text-primary/80" target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      )
      : <span className="text-primary underline underline-offset-2">{children}</span>
  },
  table: ({ children }) => (
    <div className="my-4 w-full overflow-x-auto rounded-md border border-outline-variant/50">
      <table className="w-full border-collapse font-body text-sm not-italic text-on-surface">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-surface-container/70 border-b border-outline-variant/50">
      {children}
    </thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-outline-variant/40 last:border-b-0 even:bg-surface-container/30">
      {children}
    </tr>
  ),
  th: ({ children, style }) => (
    <th
      className="px-3 py-2 text-left font-semibold text-on-surface align-top"
      style={style}
    >
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td className="px-3 py-2 align-top leading-relaxed" style={style}>
      {children}
    </td>
  ),
  del: ({ children }) => (
    <del className="text-on-surface-variant line-through">{children}</del>
  ),
  input: ({ checked, type }) => {
    if (type !== 'checkbox') return null
    return (
      <input
        type="checkbox"
        checked={!!checked}
        readOnly
        className="mr-2 accent-primary align-middle"
      />
    )
  },
}
