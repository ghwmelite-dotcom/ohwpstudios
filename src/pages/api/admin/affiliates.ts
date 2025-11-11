import type { APIRoute } from 'astro';

export const prerender = false;

// GET - List all affiliates with stats
export const GET: APIRoute = async ({ locals }) => {
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

    // Get all affiliates
    const affiliates = await db
      .prepare(`
        SELECT
          id, user_id, email, name, company_name, website,
          affiliate_code, status, tier,
          total_clicks, total_leads, total_conversions,
          total_earned, total_paid, pending_payout,
          created_at, updated_at
        FROM affiliates
        ORDER BY created_at DESC
      `)
      .all();

    // Calculate stats
    const stats = {
      total: affiliates.results?.length || 0,
      pending: affiliates.results?.filter((a: any) => a.status === 'pending').length || 0,
      active: affiliates.results?.filter((a: any) => a.status === 'active').length || 0,
      suspended: affiliates.results?.filter((a: any) => a.status === 'suspended').length || 0,
      total_clicks: affiliates.results?.reduce((sum: number, a: any) => sum + (a.total_clicks || 0), 0) || 0,
      total_leads: affiliates.results?.reduce((sum: number, a: any) => sum + (a.total_leads || 0), 0) || 0,
      total_conversions: affiliates.results?.reduce((sum: number, a: any) => sum + (a.total_conversions || 0), 0) || 0,
      total_earned: affiliates.results?.reduce((sum: number, a: any) => sum + (a.total_earned || 0), 0) || 0,
    };

    return new Response(
      JSON.stringify({
        success: true,
        affiliates: affiliates.results || [],
        stats
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching affiliates:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch affiliates'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// PUT - Update affiliate status or details
export const PUT: APIRoute = async ({ request, locals }) => {
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
    const data = await request.json();

    if (!data.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Affiliate ID is required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // If updating status
    if (data.status) {
      const validStatuses = ['pending', 'active', 'suspended', 'rejected'];
      if (!validStatuses.includes(data.status)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid status'
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Update status
      await db
        .prepare(`
          UPDATE affiliates
          SET status = ?, updated_at = datetime('now')
          WHERE id = ?
        `)
        .bind(data.status, data.id)
        .run();

      // If approving (activating), set approved metadata
      if (data.status === 'active') {
        await db
          .prepare(`
            UPDATE affiliates
            SET approved_at = datetime('now')
            WHERE id = ?
          `)
          .bind(data.id)
          .run();
      }
    }

    // If updating other fields (tier, commission rates, etc.)
    if (data.tier) {
      await db
        .prepare('UPDATE affiliates SET tier = ? WHERE id = ?')
        .bind(data.tier, data.id)
        .run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Affiliate updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating affiliate:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to update affiliate'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
