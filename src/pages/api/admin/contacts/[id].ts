import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    const { id } = params;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const submission = await db
      .prepare('SELECT * FROM contact_submissions WHERE id = ?')
      .bind(id)
      .first();

    if (!submission) {
      return new Response(
        JSON.stringify({ success: false, error: 'Submission not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get analytics data if session_id exists
    let analytics = null;
    if (submission.form_version) {
      analytics = await db
        .prepare('SELECT * FROM form_analytics WHERE session_id LIKE ? ORDER BY created_at DESC LIMIT 1')
        .bind(`%${id}%`)
        .first();
    }

    return new Response(
      JSON.stringify({
        success: true,
        submission,
        analytics
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching submission:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch submission' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
