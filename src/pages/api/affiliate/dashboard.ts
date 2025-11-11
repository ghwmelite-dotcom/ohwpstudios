import type { APIRoute } from 'astro';

export const prerender = false;

// Helper function to verify token and extract affiliate ID
function verifyToken(token: string): number | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString();
    const [affiliateId] = decoded.split(':');
    return parseInt(affiliateId, 10);
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const runtime = locals.runtime as any;

    if (!runtime?.env?.DB) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database not available'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const db = runtime.env.DB;

    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.substring(7);
    const affiliateId = verifyToken(token);

    if (!affiliateId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid token'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get affiliate details
    const affiliate = await db
      .prepare(`
        SELECT
          id, user_id, email, name, company_name, website,
          affiliate_code, status, tier,
          total_clicks, total_leads, total_conversions,
          total_earned, total_paid, pending_payout
        FROM affiliates
        WHERE id = ?
      `)
      .bind(affiliateId)
      .first();

    if (!affiliate) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Affiliate not found'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get recent commissions for activity
    const recentCommissions = await db
      .prepare(`
        SELECT
          type, amount, status, created_at
        FROM affiliate_commissions
        WHERE affiliate_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `)
      .bind(affiliateId)
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        affiliate: {
          id: affiliate.id,
          user_id: affiliate.user_id,
          name: affiliate.name,
          email: affiliate.email,
          company_name: affiliate.company_name,
          website: affiliate.website,
          affiliate_code: affiliate.affiliate_code,
          status: affiliate.status,
          tier: affiliate.tier
        },
        stats: {
          total_clicks: affiliate.total_clicks || 0,
          total_leads: affiliate.total_leads || 0,
          total_conversions: affiliate.total_conversions || 0,
          total_earned: affiliate.total_earned || 0,
          total_paid: affiliate.total_paid || 0,
          pending_payout: affiliate.pending_payout || 0
        },
        recent_activity: recentCommissions.results || []
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to load dashboard'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
