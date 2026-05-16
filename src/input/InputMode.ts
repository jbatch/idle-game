export function isCoarseInput(): boolean {
  if (navigator.maxTouchPoints > 0) return true
  return window.matchMedia('(pointer: coarse)').matches
}
