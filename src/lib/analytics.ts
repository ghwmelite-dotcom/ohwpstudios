/**
 * Single analytics entry point. Components call track() (or window.ohwpTrack)
 * and never gtag directly, so the provider can change without touching pages.
 * Strictly non-blocking: every failure path is silent.
 */
export function track(
  event: string,
  params?: Record<string, string | number | boolean>
): void {
  try {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('analytics-consent') !== 'granted') return;
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', event, params ?? {});
  } catch {
    // analytics must never break the page
  }
}
