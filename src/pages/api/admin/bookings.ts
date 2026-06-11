import type { APIRoute } from 'astro';

export const prerender = false;

// NOTE: This endpoint mirrors /api/admin/contacts.ts, which has no auth guard.
// Admin API authentication is a known Phase 3 hardening item.

export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { results } = await db
      .prepare('SELECT * FROM bookings ORDER BY created_at DESC LIMIT 200')
      .all();

    return new Response(
      JSON.stringify({ success: true, bookings: results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch bookings' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = (await request.json()) as { id?: unknown; status?: unknown };
    const { id, status } = body;

    // 'pending' kept defensively for legacy rows (pre-046 default)
    const allowed = ['new', 'pending', 'confirmed', 'completed', 'cancelled'];

    if (!Number.isInteger(id) || typeof status !== 'string' || !allowed.includes(status)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid id or status' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await db.prepare('UPDATE bookings SET status = ? WHERE id = ?').bind(status, id).run();

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating booking:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update booking' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
