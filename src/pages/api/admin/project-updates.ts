import type { APIRoute } from 'astro';

export const prerender = false;

// GET - Fetch updates for a project
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

    const url = new URL(request.url);
    const projectId = url.searchParams.get('project_id');

    if (!projectId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { results } = await db
      .prepare(
        `SELECT * FROM project_updates
         WHERE project_id = ?
         ORDER BY created_at DESC`
      )
      .bind(projectId)
      .all();

    return new Response(
      JSON.stringify({ success: true, updates: results || [] }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching updates:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch updates'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// POST - Create new update
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
    const {
      project_id,
      title,
      content,
      update_type,
      is_visible_to_client,
      created_by
    } = data;

    // Validate required fields
    if (!project_id || !title || !content) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Project ID, title, and content are required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create update
    const { results } = await db
      .prepare(
        `INSERT INTO project_updates
         (project_id, title, content, update_type, is_visible_to_client, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
         RETURNING *`
      )
      .bind(
        project_id,
        title,
        content,
        update_type || 'progress',
        is_visible_to_client !== undefined ? is_visible_to_client : 1,
        created_by || 'Admin'
      )
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        update: results[0],
        message: 'Update created successfully'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating update:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to create update'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// PUT - Update existing update
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
    const {
      id,
      title,
      content,
      update_type,
      is_visible_to_client
    } = data;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Update ID is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (content !== undefined) { updates.push('content = ?'); values.push(content); }
    if (update_type !== undefined) { updates.push('update_type = ?'); values.push(update_type); }
    if (is_visible_to_client !== undefined) {
      updates.push('is_visible_to_client = ?');
      values.push(is_visible_to_client);
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    const query = `UPDATE project_updates SET ${updates.join(', ')} WHERE id = ? RETURNING *`;

    const { results } = await db.prepare(query).bind(...values).all();

    if (!results || results.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Update not found'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        update: results[0],
        message: 'Update updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating update:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to update update'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// DELETE - Delete update
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
        JSON.stringify({
          success: false,
          error: 'Update ID is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await db
      .prepare('DELETE FROM project_updates WHERE id = ?')
      .bind(id)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Update deleted successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error deleting update:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to delete update'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
