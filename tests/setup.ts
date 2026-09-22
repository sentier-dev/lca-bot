import '@testing-library/jest-dom/vitest'

// happy-dom's WAAPI implementation rejects Animation.finished when framer-motion
// cancels an in-flight exit animation on unmount, and nothing awaits that promise,
// so it surfaces as an unhandled rejection that fails the run. Hiding
// Element.prototype.animate makes framer-motion use its JS animation loop instead.
// Remove this once happy-dom stops rejecting on cancel.
if (typeof Element !== 'undefined' && 'animate' in Element.prototype) {
  delete (Element.prototype as { animate?: unknown }).animate
}
