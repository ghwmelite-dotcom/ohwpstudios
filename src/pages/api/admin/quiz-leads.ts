import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'Database not available' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }
    const rows = await db
      .prepare('SELECT * FROM quiz_leads ORDER BY created_at DESC LIMIT 500')
      .all();
    return new Response(JSON.stringify({ success: true, leads: rows.results || [] }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching quiz leads:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to fetch quiz leads' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};

// Mark contacted. Middleware enforces the X-CSRF-Token header for mutating
// /api/admin/* requests, so no extra CSRF check is needed here.
export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'Database not available' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }
    const { id, contacted } = await request.json();
    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'Lead ID required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }
    const flag = contacted ? 1 : 0;
    await db
      .prepare(
        "UPDATE quiz_leads SET contacted = ?, contacted_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id = ?"
      )
      .bind(flag, flag, id)
      .run();
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating quiz lead:', error);
    return new Response(JSON.stringify({ success: false, error: 'Failed to update quiz lead' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
};
