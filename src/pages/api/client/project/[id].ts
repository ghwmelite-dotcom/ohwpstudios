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

// GET - Fetch single project with all details
export const GET: APIRoute = async ({ params, request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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

    // Fetch project (ensure it belongs to this client)
    const project = await db
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
        WHERE id = ? AND client_id = ?
      `)
      .bind(id, user.id)
      .first();

    if (!project) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch project updates
    const updates = await db
      .prepare(`
        SELECT
          id,
          title,
          description,
          update_type,
          created_by,
          created_at
        FROM project_updates
        WHERE project_id = ?
        ORDER BY created_at DESC
      `)
      .bind(id)
      .all();

    // Fetch milestones
    const milestones = await db
      .prepare(`
        SELECT
          id,
          title,
          description,
          due_date,
          status,
          completed_at,
          display_order
        FROM project_milestones
        WHERE project_id = ?
        ORDER BY display_order ASC, due_date ASC
      `)
      .bind(id)
      .all();

    // Fetch contracts
    const contracts = await db
      .prepare(`
        SELECT
          id,
          title,
          description,
          contract_url,
          amount,
          signed_by_client,
          signed_at,
          status,
          created_at
        FROM contracts
        WHERE project_id = ?
        ORDER BY created_at DESC
      `)
      .bind(id)
      .all();

    // Fetch files
    const files = await db
      .prepare(`
        SELECT
          id,
          file_name,
          file_url,
          file_type,
          file_size,
          category,
          description,
          uploaded_by,
          uploaded_at
        FROM project_files
        WHERE project_id = ?
        ORDER BY uploaded_at DESC
      `)
      .bind(id)
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        project: {
          ...project,
          updates: updates.results || [],
          milestones: milestones.results || [],
          contracts: contracts.results || [],
          files: files.results || []
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching project details:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch project details' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
