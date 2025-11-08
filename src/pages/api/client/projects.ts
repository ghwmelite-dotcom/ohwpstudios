import type { APIRoute } from 'astro';

export const prerender = false;

// Verify client token
async function verifyClientToken(db: any, token: string) {
  const user = await db
    .prepare('SELECT * FROM client_users WHERE token = ? AND token_expires_at > datetime("now") AND status = "active"')
    .bind(token)
    .first();

  return user;
}

// GET - Fetch all projects for logged-in client
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyClientToken(db, token);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all projects for this client
    const projects = await db
      .prepare(`
        SELECT
          id,
          project_name,
          project_type,
          description,
          start_date,
          estimated_completion,
          actual_completion,
          status,
          budget,
          progress_percentage,
          created_at,
          updated_at
        FROM client_projects
        WHERE client_id = ?
        ORDER BY created_at DESC
      `)
      .bind(user.id)
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        projects: projects.results || []
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching projects:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch projects' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
