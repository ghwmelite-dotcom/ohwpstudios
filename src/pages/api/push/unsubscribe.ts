import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: 'Subscription endpoint is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const DB = (locals as any).runtime?.env?.DB;

    if (!DB) {
      return new Response(
        JSON.stringify({
          error: 'Database not available',
          message: 'Push notifications are only available in production mode'
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Mark subscription as inactive instead of deleting (for analytics)
    const result = await DB.prepare(
      'UPDATE push_subscriptions SET is_active = 0, updated_at = datetime(\'now\') WHERE endpoint = ?'
    ).bind(endpoint).run();

    if (result.meta.changes === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Subscription not found or already unsubscribed'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('✅ Push subscription deactivated');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Unsubscribed from push notifications'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to unsubscribe',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
