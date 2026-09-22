/**
 * Escapes `$` characters that read as currency (`$5`, `$10`) rather than
 * LaTeX math delimiters (`$Ax=B$`, `$x$`), so `remark-math` does not
 * misparse a phrase like "costs $5 and $10 per kg" as inline math.
 *
 * remark-math treats any `$...$` pair as an inline math span. A `$`
 * immediately followed by a digit is the ambiguous case: it could open
 * real math (`$2\pi r$`) or a currency amount (`$5`). This module runs
 * on the raw markdown string, before it reaches the remark pipeline, and
 * decides per candidate:
 *
 * - No later `$` follows in the same paragraph -> there is nothing to
 *   pair with, so it cannot be math. Escape it.
 * - A later `$` does follow, but the character right after it is also a
 *   digit (e.g. the `$` before "10" in "$5 and $10") -> both `$` look
 *   like independent currency amounts, not one coherent math span with a
 *   single opener and closer. Escape the current one.
 * - Otherwise the pair looks like a genuine math span (`$Ax=B$`, `$x$`,
 *   `$2\pi r$`) and is left alone.
 *
 * Display math blocks (`$$...$$`) are excluded from the scan entirely so
 * currency mentions inside them are never touched, and so the scanner
 * never confuses a `$$` delimiter for two single-dollar candidates.
 */
export function guardCurrencyDollars(markdown: string): string {
  return splitOnDisplayMath(markdown)
    .map((segment) => (segment.isDisplay ? segment.value : guardInlineDollars(segment.value)))
    .join('')
}

interface Segment {
  isDisplay: boolean
  value: string
}

const DISPLAY_MATH = /\$\$[\s\S]*?\$\$/g

function splitOnDisplayMath(text: string): Segment[] {
  const segments: Segment[] = []
  let lastIndex = 0

  for (const match of text.matchAll(DISPLAY_MATH)) {
    const index = match.index
    if (index > lastIndex) {
      segments.push({ isDisplay: false, value: text.slice(lastIndex, index) })
    }
    segments.push({ isDisplay: true, value: match[0] })
    lastIndex = index + match[0].length
  }

  if (lastIndex < text.length) {
    segments.push({ isDisplay: false, value: text.slice(lastIndex) })
  }

  return segments
}

const DIGIT = /[0-9]/

function guardInlineDollars(text: string): string {
  let result = ''
  let i = 0

  while (i < text.length) {
    const char = text[i]

    // Already-escaped dollar: copy through untouched, do not re-escape.
    if (char === '\\' && text[i + 1] === '$') {
      result += '\\$'
      i += 2
      continue
    }

    if (char !== '$' || !DIGIT.test(text[i + 1] ?? '')) {
      result += char
      i += 1
      continue
    }

    const closeIndex = findNextUnescapedDollar(text, i + 1)
    const closingLooksLikeAnotherAmount = closeIndex !== -1 && DIGIT.test(text[closeIndex + 1] ?? '')
    const isCurrency = closeIndex === -1 || closingLooksLikeAnotherAmount

    result += isCurrency ? '\\$' : char
    i += 1
  }

  return result
}

/** Finds the next unescaped `$`, stopping at a paragraph break (blank line). */
function findNextUnescapedDollar(text: string, from: number): number {
  for (let j = from; j < text.length; j += 1) {
    if (text[j] === '\n' && text[j + 1] === '\n') return -1
    if (text[j] === '$' && text[j - 1] !== '\\') return j
  }
  return -1
}
