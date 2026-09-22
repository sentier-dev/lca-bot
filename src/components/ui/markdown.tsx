'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeKatex from 'rehype-katex'
import type { PluggableList } from 'unified'
import { MARKDOWN_WRAPPER_CLASS, markdownComponents } from '@/components/ui/markdown-components'
import { guardCurrencyDollars } from '@/lib/markdown/remark-math-guards'

const remarkPlugins: PluggableList = [remarkGfm, remarkMath]
// Model output is untrusted: raw HTML, scripts and event handlers are dropped
// before the tree reaches the renderer. rehype-katex runs after sanitizing,
// so its generated KaTeX markup (built from the math text, not from model
// HTML) is never stripped.
const rehypePlugins: PluggableList = [[rehypeSanitize, defaultSchema], rehypeKatex]

interface MarkdownProps {
  content: string
  className?: string
}

export function Markdown({ content, className = '' }: MarkdownProps) {
  return (
    <div className={`${MARKDOWN_WRAPPER_CLASS} ${className}`}>
      <ReactMarkdown components={markdownComponents} remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
        {guardCurrencyDollars(content)}
      </ReactMarkdown>
    </div>
  )
}
