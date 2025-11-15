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

// Helper function to send push notification using Web Push API
async function sendPushNotification(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: any,
  vapidKeys: { publicKey: string; privateKey: string; subject: string }
): Promise<boolean> {
  try {
    // Prepare the payload
    const payloadString = JSON.stringify(payload);
    const payloadUint8Array = new TextEncoder().encode(payloadString);

    // For now, we'll use a basic fetch to the endpoint
    // In production, this should use proper Web Push protocol with VAPID
    // This is a simplified version - full implementation requires web-push library
    console.log('Sending push notification to:', subscription.endpoint);

    // Note: This is a placeholder. Full Web Push implementation requires:
    // 1. VAPID key generation and signing
    // 2. Payload encryption using p256dh_key and auth_key
    // 3. Proper headers (Authorization, Crypto-Key, etc.)
    // For Cloudflare Workers, consider using a service like OneSignal or Pushpad

    return true;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return false;
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

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

    const body = await request.json();
    const { title, message, url, targetUserType, targetUserId } = body;

    if (!title || !message) {
      return new Response(
        JSON.stringify({ error: 'Title and message are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Build the query to get active subscriptions
    let query = 'SELECT * FROM push_subscriptions WHERE is_active = 1';
    const bindings: any[] = [];

    if (targetUserType && targetUserType !== 'all') {
      query += ' AND user_type = ?';
      bindings.push(targetUserType);
    }

    if (targetUserId) {
      query += ' AND user_id = ?';
      bindings.push(targetUserId);
    }

    // Get all matching subscriptions
    const subscriptions = await DB.prepare(query).bind(...bindings).all();

    if (!subscriptions.results || subscriptions.results.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active subscriptions found',
          sent: 0
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Prepare notification payload
    const payload = {
      title,
      body: message,
      icon: '/icons/icon-192x192.svg',
      badge: '/icons/icon-72x72.svg',
      url: url || '/',
      timestamp: Date.now(),
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View'
        }
      ]
    };

    // VAPID keys should be stored in environment variables
    const vapidKeys = {
      publicKey: (locals as any).runtime?.env?.VAPID_PUBLIC_KEY || '',
      privateKey: (locals as any).runtime?.env?.VAPID_PRIVATE_KEY || '',
      subject: (locals as any).runtime?.env?.VAPID_SUBJECT || 'mailto:admin@wpstudios.org'
    };

    // Send to all subscriptions
    let sentCount = 0;
    const failedEndpoints: string[] = [];

    for (const sub of subscriptions.results) {
      try {
        const success = await sendPushNotification(
          {
            endpoint: sub.endpoint,
            p256dh_key: sub.p256dh_key,
            auth_key: sub.auth_key
          },
          payload,
          vapidKeys
        );

        if (success) {
          sentCount++;
          // Update last_used_at
          await DB.prepare(
            'UPDATE push_subscriptions SET last_used_at = datetime(\'now\') WHERE id = ?'
          ).bind(sub.id).run();
        } else {
          failedEndpoints.push(sub.endpoint);
        }
      } catch (error) {
        console.error('Failed to send to subscription:', sub.id, error);
        failedEndpoints.push(sub.endpoint);
      }
    }

    // Log the notification
    await DB.prepare(
      `INSERT INTO push_notifications
       (title, body, url, target_user_type, target_user_id, sent_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      title,
      message,
      url || null,
      targetUserType || 'all',
      targetUserId || null,
      sentCount
    ).run();

    console.log(`✅ Sent ${sentCount} push notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${sentCount} notifications`,
        sent: sentCount,
        failed: failedEndpoints.length,
        total: subscriptions.results.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Push send error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to send notifications',
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
