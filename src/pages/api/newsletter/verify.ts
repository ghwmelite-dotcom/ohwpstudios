import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    const token = url.searchParams.get('token');

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, message: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: 'Verification token is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find subscriber with this token
    const subscriber = await db
      .prepare('SELECT * FROM newsletter_subscribers WHERE verification_token = ?')
      .bind(token)
      .first();

    if (!subscriber) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid or expired verification token' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (subscriber.status === 'active') {
      return new Response(
        JSON.stringify({ success: true, message: 'Your email is already verified!' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update subscriber status to active
    await db
      .prepare(`
        UPDATE newsletter_subscribers
        SET status = 'active',
            confirmed_at = CURRENT_TIMESTAMP,
            verification_token = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE verification_token = ?
      `)
      .bind(token)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email verified successfully! Welcome to our newsletter.',
        email: subscriber.email
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Newsletter verification error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'An error occurred during verification' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
