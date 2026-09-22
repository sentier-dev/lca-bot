'use client'

import { useTranslations } from 'next-intl'
import type { ToolTraceEntry } from '@/types/chat'

function label(entry: ToolTraceEntry): string {
  const i = entry.input
  switch (entry.name) {
    case 'search_wiki': return `search_wiki "${String(i.query ?? '')}"${i.branch ? ` in ${String(i.branch)}` : ''}`
    case 'read_page': return `read_page ${String(i.path ?? '')}${typeof i.offset === 'number' && i.offset > 0 ? ` from ${i.offset}` : ''}`
    case 'lookup_term': return `lookup_term "${String(i.term ?? '')}"`
    case 'lookup_source': return `lookup_source ${String(i.id ?? '')}`
    case 'report_gap': return 'report_gap'
    default: return entry.name
  }
}

export function ToolTrace({ trace }: { trace: ToolTraceEntry[] }) {
  const t = useTranslations('chat.trace')
  if (trace.length === 0) return null
  return (
    <details className="mt-2 text-xs text-on-surface-variant" data-testid="tool-trace">
      <summary className="cursor-pointer select-none hover:text-on-surface">{t('summary', { count: trace.length })}</summary>
      <ol className="mt-1 space-y-0.5 font-mono text-[11px] pl-4 list-decimal">
        {trace.map((entry, i) => <li key={i}>{label(entry)}</li>)}
      </ol>
    </details>
  )
}
