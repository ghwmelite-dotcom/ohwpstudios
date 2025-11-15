// HTML Sanitization Utility
// Prevents XSS attacks by sanitizing user-generated content before DOM insertion

/**
 * Basic HTML sanitization - removes dangerous tags and attributes
 * For production, consider using a library like DOMPurify
 */
export function sanitizeHTML(html: string): string {
  if (!html) return '';

  // Remove script tags and their content
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  html = html.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  html = html.replace(/javascript:/gi, '');

  // Remove data: protocol (can be used for XSS)
  html = html.replace(/data:text\/html/gi, '');

  // Remove iframe tags
  html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Remove object and embed tags
  html = html.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  html = html.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

  // Remove style tags (can contain expression() XSS)
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove dangerous style attributes
  html = html.replace(/\s*style\s*=\s*["'][^"']*expression\([^"']*\)["']/gi, '');

  return html;
}

/**
 * Escape HTML special characters to prevent XSS
 * Use this for plain text that should be displayed as-is
 */
export function escapeHTML(text: string): string {
  if (!text) return '';

  const div = typeof document !== 'undefined' ? document.createElement('div') : null;
  if (div) {
    div.textContent = text;
    return div.innerHTML;
  }

  // Fallback for server-side
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize and set innerHTML safely
 * @param element The DOM element to update
 * @param html The HTML content to set (will be sanitized)
 */
export function safeSetInnerHTML(element: HTMLElement | null, html: string): void {
  if (!element) return;
  element.innerHTML = sanitizeHTML(html);
}

/**
 * Create a safe HTML string from template literal
 * Use this for trusted HTML content that still needs basic sanitization
 */
export function html(strings: TemplateStringsArray, ...values: any[]): string {
  let result = strings[0];

  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    // Escape values by default, unless they're marked as safe
    result += (typeof value === 'string' ? escapeHTML(value) : String(value));
    result += strings[i + 1];
  }

  return result;
}

/**
 * Mark a string as safe HTML (already sanitized)
 * Use with caution - only for content you fully trust
 */
export function trustHTML(html: string): { __html: string; __trusted: true } {
  return { __html: html, __trusted: true };
}

/**
 * Check if value is trusted HTML
 */
export function isTrustedHTML(value: any): value is { __html: string; __trusted: true } {
  return value && typeof value === 'object' && value.__trusted === true;
}
