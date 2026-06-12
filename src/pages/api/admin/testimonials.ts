import type { APIRoute } from 'astro';

export const prerender = false;

// NOTE: This endpoint mirrors /api/admin/bookings.ts, which has no auth guard.
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
      .prepare('SELECT * FROM testimonials ORDER BY is_active ASC, created_at DESC')
      .all();

    return new Response(
      JSON.stringify({ success: true, testimonials: results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch testimonials' }),
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

    const body = (await request.json()) as { id?: unknown; is_active?: unknown };
    const { id, is_active } = body;

    if (!Number.isInteger(id) || (is_active !== 0 && is_active !== 1)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid id or is_active' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await db
      .prepare('UPDATE testimonials SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(is_active, id)
      .run();

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating testimonial:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update testimonial' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
