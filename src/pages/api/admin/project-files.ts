import type { APIRoute } from 'astro';

export const prerender = false;

// GET - Fetch files for a project
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
        `SELECT * FROM project_files
         WHERE project_id = ?
         ORDER BY created_at DESC`
      )
      .bind(projectId)
      .all();

    return new Response(
      JSON.stringify({ success: true, files: results || [] }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching files:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch files'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// POST - Add new file reference
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
      filename,
      original_filename,
      file_url,
      file_size,
      file_type,
      category,
      description,
      is_visible_to_client,
      uploaded_by,
      version,
      parent_file_id
    } = data;

    // Validate required fields
    if (!project_id || !filename || !original_filename || !file_url) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Project ID, filename, original filename, and file URL are required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create file record
    const { results } = await db
      .prepare(
        `INSERT INTO project_files
         (project_id, filename, original_filename, file_url, file_size, file_type, category, description,
          is_visible_to_client, uploaded_by, version, parent_file_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
         RETURNING *`
      )
      .bind(
        project_id,
        filename,
        original_filename,
        file_url,
        file_size || null,
        file_type || null,
        category || 'general',
        description || null,
        is_visible_to_client !== undefined ? is_visible_to_client : 1,
        uploaded_by || 'Admin',
        version || 1,
        parent_file_id || null
      )
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        file: results[0],
        message: 'File added successfully'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error adding file:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to add file'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// PUT - Update file metadata
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
      category,
      description,
      is_visible_to_client
    } = data;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'File ID is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];

    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (is_visible_to_client !== undefined) {
      updates.push('is_visible_to_client = ?');
      values.push(is_visible_to_client);
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    const query = `UPDATE project_files SET ${updates.join(', ')} WHERE id = ? RETURNING *`;

    const { results } = await db.prepare(query).bind(...values).all();

    if (!results || results.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'File not found'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        file: results[0],
        message: 'File updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating file:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to update file'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// DELETE - Delete file
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
          error: 'File ID is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await db
      .prepare('DELETE FROM project_files WHERE id = ?')
      .bind(id)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'File deleted successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error deleting file:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to delete file'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
