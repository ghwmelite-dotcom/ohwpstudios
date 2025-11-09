import type { APIRoute } from 'astro';

export const prerender = false;

// GET - Fetch all clients
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

    // Fetch all clients
    const clients = await db
      .prepare('SELECT * FROM clients ORDER BY display_order ASC, created_at DESC')
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        clients: clients.results || []
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching clients:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch clients' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST - Create new client
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
    if (!data.name || !data.logo_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'Name and logo URL are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert new client
    const result = await db
      .prepare(`
        INSERT INTO clients (
          name, logo_url, website_url, industry, description,
          project_type, project_value, testimonial, testimonial_author,
          testimonial_position, is_featured, display_order, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        data.name,
        data.logo_url,
        data.website_url || null,
        data.industry || null,
        data.description || null,
        data.project_type || null,
        data.project_value || null,
        data.testimonial || null,
        data.testimonial_author || null,
        data.testimonial_position || null,
        data.is_featured || 0,
        data.display_order || 0,
        data.status || 'active'
      )
      .run();

    if (!result.success) {
      throw new Error('Failed to create client');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Client created successfully',
        clientId: result.meta.last_row_id
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating client:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to create client' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT - Update client
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
        JSON.stringify({ success: false, error: 'Client ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update client
    const result = await db
      .prepare(`
        UPDATE clients SET
          name = ?,
          logo_url = ?,
          website_url = ?,
          industry = ?,
          description = ?,
          project_type = ?,
          project_value = ?,
          testimonial = ?,
          testimonial_author = ?,
          testimonial_position = ?,
          is_featured = ?,
          display_order = ?,
          status = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `)
      .bind(
        data.name,
        data.logo_url,
        data.website_url || null,
        data.industry || null,
        data.description || null,
        data.project_type || null,
        data.project_value || null,
        data.testimonial || null,
        data.testimonial_author || null,
        data.testimonial_position || null,
        data.is_featured || 0,
        data.display_order || 0,
        data.status || 'active',
        data.id
      )
      .run();

    if (!result.success) {
      throw new Error('Failed to update client');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Client updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating client:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update client' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE - Delete client
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
        JSON.stringify({ success: false, error: 'Client ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete client
    const result = await db
      .prepare('DELETE FROM clients WHERE id = ?')
      .bind(id)
      .run();

    if (!result.success) {
      throw new Error('Failed to delete client');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Client deleted successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error deleting client:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to delete client' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
