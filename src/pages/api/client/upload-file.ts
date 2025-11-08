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

// POST - Upload file to a project (URL input for now)
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
    const user = await verifyClientToken(db, token);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();
    const { project_id, file_name, file_url, file_type, file_size, category, description } = data;

    // Validate required fields
    if (!project_id || !file_name || !file_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project ID, file name, and file URL are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify the project belongs to this client
    const project = await db
      .prepare('SELECT id FROM client_projects WHERE id = ? AND client_id = ?')
      .bind(project_id, user.id)
      .first();

    if (!project) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert file record
    const result = await db
      .prepare(`
        INSERT INTO project_files (
          project_id,
          file_name,
          file_url,
          file_type,
          file_size,
          category,
          description,
          uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        project_id,
        file_name,
        file_url,
        file_type || null,
        file_size || null,
        category || 'general',
        description || null,
        `client:${user.email}`
      )
      .run();

    if (!result.success) {
      throw new Error('Failed to upload file');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'File uploaded successfully',
        fileId: result.meta.last_row_id
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error uploading file:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to upload file' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
