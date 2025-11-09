import type { APIRoute } from 'astro';

export const prerender = false;

// Password hashing function (from client login)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// GET - Fetch all client users
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

    // Fetch all client users (exclude password hash in response)
    const users = await db
      .prepare(`
        SELECT
          id, email, company_name, contact_name, phone, status,
          created_at, updated_at, token_expires_at
        FROM client_users
        ORDER BY created_at DESC
      `)
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        users: users.results || []
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching client users:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch client users' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST - Create new client user
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
    if (!data.email || !data.password || !data.company_name || !data.contact_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email, password, company name, and contact name are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already exists
    const existingUser = await db
      .prepare('SELECT id FROM client_users WHERE email = ?')
      .bind(data.email.toLowerCase())
      .first();

    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email already exists' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Insert new client user
    const result = await db
      .prepare(`
        INSERT INTO client_users (
          email, password_hash, company_name, contact_name, phone, status
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        data.email.toLowerCase(),
        passwordHash,
        data.company_name,
        data.contact_name,
        data.phone || null,
        data.status || 'active'
      )
      .run();

    if (!result.success) {
      throw new Error('Failed to create client user');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Client user created successfully',
        userId: result.meta.last_row_id
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating client user:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to create client user' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT - Update client user
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
        JSON.stringify({ success: false, error: 'Client user ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If password is provided, hash it and update; otherwise, don't change password
    if (data.password) {
      const passwordHash = await hashPassword(data.password);

      const result = await db
        .prepare(`
          UPDATE client_users SET
            email = ?,
            password_hash = ?,
            company_name = ?,
            contact_name = ?,
            phone = ?,
            status = ?,
            updated_at = datetime('now')
          WHERE id = ?
        `)
        .bind(
          data.email.toLowerCase(),
          passwordHash,
          data.company_name,
          data.contact_name,
          data.phone || null,
          data.status || 'active',
          data.id
        )
        .run();

      if (!result.success) {
        throw new Error('Failed to update client user');
      }
    } else {
      // Update without changing password
      const result = await db
        .prepare(`
          UPDATE client_users SET
            email = ?,
            company_name = ?,
            contact_name = ?,
            phone = ?,
            status = ?,
            updated_at = datetime('now')
          WHERE id = ?
        `)
        .bind(
          data.email.toLowerCase(),
          data.company_name,
          data.contact_name,
          data.phone || null,
          data.status || 'active',
          data.id
        )
        .run();

      if (!result.success) {
        throw new Error('Failed to update client user');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Client user updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating client user:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update client user' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE - Delete client user
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
        JSON.stringify({ success: false, error: 'Client user ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete client user
    const result = await db
      .prepare('DELETE FROM client_users WHERE id = ?')
      .bind(id)
      .run();

    if (!result.success) {
      throw new Error('Failed to delete client user');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Client user deleted successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error deleting client user:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to delete client user' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
