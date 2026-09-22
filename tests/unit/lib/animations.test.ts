import { describe, it, expect } from 'vitest'
import {
  EASE_EDITORIAL,
  EASE_FADE,
  EASE_SLIDE,
  fadeIn,
  slideUp,
  slideUpMessage,
  chipStagger,
} from '@/lib/animations'

describe('easing tokens', () => {
  it('EASE_EDITORIAL is a four-point cubic bezier with in-range control points', () => {
    expect(EASE_EDITORIAL).toEqual([0.25, 0.1, 0.25, 1.0])
    expect(EASE_EDITORIAL).toHaveLength(4)
    // x control points must stay within [0, 1] for a valid CSS cubic-bezier.
    expect(EASE_EDITORIAL[0]).toBeGreaterThanOrEqual(0)
    expect(EASE_EDITORIAL[0]).toBeLessThanOrEqual(1)
    expect(EASE_EDITORIAL[2]).toBeGreaterThanOrEqual(0)
    expect(EASE_EDITORIAL[2]).toBeLessThanOrEqual(1)
  })

  it('EASE_FADE is the shorter of the two transitions', () => {
    expect(EASE_FADE).toEqual({ duration: 0.2, ease: 'easeOut' })
    expect(EASE_SLIDE).toEqual({ duration: 0.35, ease: EASE_EDITORIAL })
    expect(EASE_FADE.duration as number).toBeLessThan(EASE_SLIDE.duration as number)
  })

  it('EASE_SLIDE reuses the editorial curve rather than copying it', () => {
    expect(EASE_SLIDE.ease).toBe(EASE_EDITORIAL)
  })
})

describe('variants', () => {
  it('fadeIn only animates opacity', () => {
    expect(fadeIn).toEqual({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    })
  })

  it('slideUp rises from below and leaves upwards', () => {
    expect(slideUp.initial).toEqual({ opacity: 0, y: 8 })
    expect(slideUp.animate).toEqual({ opacity: 1, y: 0 })
    expect(slideUp.exit).toEqual({ opacity: 0, y: -4 })
  })

  it('slideUpMessage travels further than slideUp on entry', () => {
    expect(slideUpMessage.initial).toEqual({ opacity: 0, y: 12 })
    expect(slideUpMessage.animate).toEqual({ opacity: 1, y: 0 })
    expect(slideUpMessage.exit).toEqual({ opacity: 0, y: -4 })
    const slideUpY = (slideUp.initial as { y: number }).y
    const messageY = (slideUpMessage.initial as { y: number }).y
    expect(messageY).toBeGreaterThan(slideUpY)
  })

  it('chipStagger exits by fading only', () => {
    expect(chipStagger.initial).toEqual({ opacity: 0, y: 4 })
    expect(chipStagger.animate).toEqual({ opacity: 1, y: 0 })
    expect(chipStagger.exit).toEqual({ opacity: 0 })
  })

  it('every variant defines initial, animate and exit and settles at full opacity', () => {
    for (const variants of [fadeIn, slideUp, slideUpMessage, chipStagger]) {
      expect(Object.keys(variants).sort()).toEqual(['animate', 'exit', 'initial'])
      expect((variants.animate as { opacity: number }).opacity).toBe(1)
      expect((variants.initial as { opacity: number }).opacity).toBe(0)
    }
  })
})
