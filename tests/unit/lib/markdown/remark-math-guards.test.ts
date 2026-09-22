import { describe, it, expect } from 'vitest'
import { guardCurrencyDollars } from '@/lib/markdown/remark-math-guards'

describe('guardCurrencyDollars', () => {
  it('leaves inline math with a variable expression untouched', () => {
    expect(guardCurrencyDollars('Solve $Ax=B$ for x.')).toBe('Solve $Ax=B$ for x.')
  })

  it('leaves a single-variable inline math span untouched', () => {
    expect(guardCurrencyDollars('Let $x$ be the flow amount.')).toBe('Let $x$ be the flow amount.')
  })

  it('escapes two currency amounts so they stay literal text', () => {
    const input = 'Steel costs $5 and $10 per kg.'
    const output = guardCurrencyDollars(input)
    expect(output).toBe('Steel costs \\$5 and \\$10 per kg.')
  })

  it('escapes a single trailing currency amount with no closing dollar', () => {
    expect(guardCurrencyDollars('It costs about $5 today.')).toBe('It costs about \\$5 today.')
  })

  it('leaves a display math block on its own line untouched', () => {
    const input = 'Balance equation:\n\n$$\nA x = B\n$$\n'
    expect(guardCurrencyDollars(input)).toBe(input)
  })

  it('does not disturb currency mentions inside a display math block', () => {
    const input = 'Formula:\n\n$$\nA x = B\n$$\n\nand it costs $5 and $10 per kg.'
    const output = guardCurrencyDollars(input)
    expect(output).toContain('$$\nA x = B\n$$')
    expect(output).toContain('\\$5 and \\$10 per kg')
  })

  it('handles inline math and a currency mention in the same line', () => {
    const input = 'Given $x$, the price is $5 and $10 per unit.'
    const output = guardCurrencyDollars(input)
    expect(output).toBe('Given $x$, the price is \\$5 and \\$10 per unit.')
  })

  it('leaves plain text without dollar signs untouched', () => {
    expect(guardCurrencyDollars('No math here.')).toBe('No math here.')
  })

  it('does not re-escape an already-escaped dollar sign', () => {
    expect(guardCurrencyDollars('It costs \\$5 already escaped.')).toBe('It costs \\$5 already escaped.')
  })
})
