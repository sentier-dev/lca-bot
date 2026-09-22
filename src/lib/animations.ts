import type { Variants, Transition } from 'framer-motion'

export const EASE_EDITORIAL: [number, number, number, number] = [0.25, 0.1, 0.25, 1.0]

export const EASE_FADE: Transition = { duration: 0.2, ease: 'easeOut' }
export const EASE_SLIDE: Transition = { duration: 0.35, ease: EASE_EDITORIAL }

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export const slideUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export const slideUpMessage: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export const chipStagger: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0 },
}
