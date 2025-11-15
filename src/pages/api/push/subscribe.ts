import type { APIRoute } from 'astro';
import { getCORSHeaders, handleCORSPreflight } from '@/utils/cors';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { subscription, userType, userId } = body;

    if (!subscription || !subscription.endpoint) {
      return new Response(
        JSON.stringify({ error: 'Valid subscription object is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!userType || !['admin', 'client'].includes(userType)) {
      return new Response(
        JSON.stringify({ error: 'Valid userType (admin or client) is required' }),
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

    // Extract keys from subscription
    const endpoint = subscription.endpoint;
    const p256dhKey = subscription.keys?.p256dh || '';
    const authKey = subscription.keys?.auth || '';

    // Get user agent
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Check if subscription already exists
    const existing = await DB.prepare(
      'SELECT id, is_active FROM push_subscriptions WHERE endpoint = ?'
    ).bind(endpoint).first();

    if (existing) {
      // Reactivate if inactive
      if (!existing.is_active) {
        await DB.prepare(
          'UPDATE push_subscriptions SET is_active = 1, updated_at = datetime(\'now\') WHERE id = ?'
        ).bind(existing.id).run();

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Subscription reactivated',
            subscriptionId: existing.id
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Already subscribed',
          subscriptionId: existing.id
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Create new subscription
    const result = await DB.prepare(
      `INSERT INTO push_subscriptions
       (endpoint, p256dh_key, auth_key, user_type, user_id, user_agent, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`
    ).bind(endpoint, p256dhKey, authKey, userType, userId, userAgent).run();

    console.log('✅ Push subscription created:', result.meta.last_row_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Subscribed to push notifications',
        subscriptionId: result.meta.last_row_id
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Push subscription error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create subscription',
        details: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

export const OPTIONS: APIRoute = async (context) => {
  const preflightResponse = handleCORSPreflight(context.request);
  if (preflightResponse) {
    return preflightResponse;
  }
  return new Response(null, { status: 405 });
};
