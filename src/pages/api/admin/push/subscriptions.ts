import type { APIRoute } from 'astro';
import { getCORSHeaders, handleCORSPreflight } from '@/utils/cors';

export const prerender = false;

// Helper function to verify admin session
async function verifyAdminSession(token: string, DB: any): Promise<boolean> {
  if (!token || !DB) return false;

  try {
    const session = await DB.prepare(
      `SELECT s.*, u.username
       FROM sessions s
       JOIN admin_users u ON s.user_id = u.id
       WHERE s.token = ? AND s.expires_at > datetime('now')`
    ).bind(token).first();

    return !!session;
  } catch (error) {
    console.error('Session verification error:', error);
    return false;
  }
}

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

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

    // Verify admin authentication
    const isAdmin = await verifyAdminSession(token || '', DB);
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
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
