export const prerender = false;

export async function GET(): Promise<Response> {
  throw new Error('Sentry server verification — safe to ignore');
}
