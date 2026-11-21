import { SITE_CONFIG } from '../config';

export const TELEGRAM_URL = SITE_CONFIG.social.telegram;
export const TELEGRAM_HANDLE = `@${new URL(TELEGRAM_URL).pathname.slice(1)}`;
export const QUOTE_MESSAGE = 'Every project is scoped individually. Contact Hodges & Co. Studios on Telegram so we can review your requirements and provide a tailored estimate.';

export function telegramQuoteLink(briefUrl?: string): string {
  const link = new URL(TELEGRAM_URL);
  const text = briefUrl
    ? `Hello Hodges & Co. Studios. Please review my project brief and help me with a tailored estimate: ${briefUrl}`
    : 'Hello Hodges & Co. Studios. I would like to discuss a project and get a tailored estimate.';
  link.searchParams.set('text', text);
  // Keep Telegram's documented valueless channel-DM flag when adding a draft.
  return link.href.replace(/([?&])direct=(?=&|$)/, '$1direct');
}

/** Defence in depth: generated text and historical scopes cannot publish prices. */
export function quoteSafeText(value: string): string {
  return /(?:[$€£₵¢]\s*\d|\b(?:USD|GHS|GH₵|GH¢)\s*[\d,]|\d[\d,.]*\s*(?:USD|GHS|cedis|dollars)\b)/i.test(value)
    ? QUOTE_MESSAGE : value;
}

export function publicProjectScope(analysis: object): Record<string, unknown> {
  const allowed = new Set(['summary', 'complexity_assessment', 'key_features', 'estimated_timeline_weeks', 'technology_stack', 'team_composition', 'team_size_needed', 'risk_level', 'risk_factors', 'recommendations', 'next_steps']);
  function scrub(value: unknown): unknown {
    if (typeof value === 'string') return quoteSafeText(value);
    if (Array.isArray(value)) return value.map(scrub);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, scrub(child)]));
    return value;
  }
  return Object.fromEntries(Object.entries(analysis).filter(([key]) => allowed.has(key)).map(([key, value]) => [key, scrub(value)]));
}
