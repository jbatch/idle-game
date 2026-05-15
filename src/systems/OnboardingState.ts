const SEEN_TIPS_KEY = 'siegeloop_seen_onboarding_tips'
const SKIP_TIPS_KEY = 'siegeloop_skip_onboarding_tips'

function loadSeen(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SEEN_TIPS_KEY) ?? '[]')) }
  catch { return new Set() }
}

export const onboardingState = {
  shouldShow(id: string): boolean {
    if (localStorage.getItem(SKIP_TIPS_KEY) === 'true') return false
    return !loadSeen().has(id)
  },
  complete(id: string) {
    const seen = loadSeen()
    seen.add(id)
    localStorage.setItem(SEEN_TIPS_KEY, JSON.stringify([...seen]))
  },
  skipAll() {
    localStorage.setItem(SKIP_TIPS_KEY, 'true')
  },
  reset() {
    localStorage.removeItem(SEEN_TIPS_KEY)
    localStorage.removeItem(SKIP_TIPS_KEY)
  },
}
