import type { APIRoute } from 'astro';
import { getCORSHeaders, handleCORSPreflight } from '@/utils/cors';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const DB = (locals as any).runtime?.env?.DB;

    if (!DB) {
      return new Response(
        JSON.stringify({
          error: 'Database not available',
          message: 'Push subscriptions are only available in production mode'
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get subscription statistics
    const stats = await DB.prepare(
      `SELECT
         COUNT(*) as total,
         SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
         SUM(CASE WHEN user_type = 'admin' THEN 1 ELSE 0 END) as admin_count,
         SUM(CASE WHEN user_type = 'client' THEN 1 ELSE 0 END) as client_count
       FROM push_subscriptions`
    ).first();

    // Get recent subscriptions
    const subscriptions = await DB.prepare(
      `SELECT
         id, user_type, user_id, user_agent, is_active,
         created_at, updated_at, last_used_at,
         substr(endpoint, 1, 50) || '...' as endpoint_preview
       FROM push_subscriptions
       ORDER BY created_at DESC
       LIMIT 100`
    ).all();

    // Get recent notifications
    const notifications = await DB.prepare(
      `SELECT id, title, body, target_user_type, sent_count, created_at
       FROM push_notifications
       ORDER BY created_at DESC
       LIMIT 20`
    ).all();

    return new Response(
      JSON.stringify({
        stats,
        subscriptions: subscriptions.results || [],
        notifications: notifications.results || []
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error fetching push subscriptions:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch subscriptions',
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
