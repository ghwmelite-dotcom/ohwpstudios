import type { APIRoute } from 'astro';

export const prerender = false;

// GET - Fetch all client projects with client info
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
    const session = await db
      .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(token)
      .first();

    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all projects with client info
    const projects = await db
      .prepare(`
        SELECT
          cp.*,
          cu.company_name,
          cu.contact_name,
          cu.email
        FROM client_projects cp
        LEFT JOIN client_users cu ON cp.client_id = cu.id
        ORDER BY cp.created_at DESC
      `)
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
    console.error('Error fetching client projects:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch client projects' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST - Create new client project
export const POST: APIRoute = async ({ request, locals }) => {
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
    const session = await db
      .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(token)
      .first();

    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.client_id || !data.project_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Client ID and project name are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert new project
    const result = await db
      .prepare(`
        INSERT INTO client_projects (
          client_id, project_name, project_type, description,
          start_date, estimated_completion, budget, status, progress_percentage
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        data.client_id,
        data.project_name,
        data.project_type || 'general',
        data.description || null,
        data.start_date || null,
        data.estimated_completion || null,
        data.budget || null,
        data.status || 'in_progress',
        data.progress_percentage || 0
      )
      .run();

    if (!result.success) {
      throw new Error('Failed to create client project');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Client project created successfully',
        projectId: result.meta.last_row_id
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating client project:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to create client project' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT - Update client project
export const PUT: APIRoute = async ({ request, locals }) => {
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
    const session = await db
      .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(token)
      .first();

    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();

    if (!data.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update project
    const result = await db
      .prepare(`
        UPDATE client_projects SET
          client_id = ?,
          project_name = ?,
          project_type = ?,
          description = ?,
          start_date = ?,
          end_date = ?,
          budget = ?,
          status = ?,
          progress = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `)
      .bind(
        data.client_id,
        data.project_name,
        data.project_type || null,
        data.description || null,
        data.start_date || null,
        data.end_date || null,
        data.budget || null,
        data.status || 'active',
        data.progress || 0,
        data.id
      )
      .run();

    if (!result.success) {
      throw new Error('Failed to update client project');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Client project updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating client project:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update client project' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE - Delete client project
export const DELETE: APIRoute = async ({ request, locals }) => {
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
    const session = await db
      .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(token)
      .first();

    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete project
    const result = await db
      .prepare('DELETE FROM client_projects WHERE id = ?')
      .bind(id)
      .run();

    if (!result.success) {
      throw new Error('Failed to delete client project');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Client project deleted successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error deleting client project:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to delete client project' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
