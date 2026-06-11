/** Canonical consent contract — BaseLayout's inline GA loader receives these via define:vars. */
export const CONSENT_KEY = 'analytics-consent';
export const CONSENT_GRANTED = 'granted';

/**
 * Single analytics entry point. Components call track() (or window.ohwpTrack)
 * and never gtag directly, so the provider can change without touching pages.
 * Strictly non-blocking: every failure path is silent.
 * Assigned to window.ohwpTrack after module eval — call only from event handlers; eval-time calls are dropped.
 */
export function track(
  event: string,
  params?: Record<string, string | number | boolean>
): void {
  try {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(CONSENT_KEY) !== CONSENT_GRANTED) return;
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', event, params ?? {});
  } catch {
    // analytics must never break the page
  }
}
