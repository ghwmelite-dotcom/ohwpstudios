import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, message: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { email, token } = body;

    // Validate input
    if ((!email && !token) || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return new Response(
        JSON.stringify({ success: false, message: 'Please provide a valid email address or token' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find subscriber
    let subscriber;
    if (token) {
      subscriber = await db
        .prepare('SELECT * FROM newsletter_subscribers WHERE id = ?')
        .bind(token)
        .first();
    } else {
      subscriber = await db
        .prepare('SELECT * FROM newsletter_subscribers WHERE email = ?')
        .bind(email.toLowerCase())
        .first();
    }

    if (!subscriber) {
      return new Response(
        JSON.stringify({ success: false, message: 'Email address not found in our subscriber list' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (subscriber.status === 'unsubscribed') {
      return new Response(
        JSON.stringify({ success: true, message: 'This email is already unsubscribed' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Unsubscribe
    await db
      .prepare(`
        UPDATE newsletter_subscribers
        SET status = 'unsubscribed',
            unsubscribed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(subscriber.id)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'You have been successfully unsubscribed from our newsletter'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'An error occurred while unsubscribing' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
