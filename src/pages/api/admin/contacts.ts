import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get query parameters for filtering
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    const service = url.searchParams.get('service');
    const search = url.searchParams.get('search');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build query
    let query = 'SELECT * FROM contact_submissions WHERE 1=1';
    const params: any[] = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }

    if (service) {
      query += ' AND service_type = ?';
      params.push(service);
    }

    if (search) {
      query += ' AND (full_name LIKE ? OR email LIKE ? OR company LIKE ? OR project_description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    // Execute query
    const submissions = await db.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM contact_submissions WHERE 1=1';
    const countParams: any[] = [];

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    if (priority) {
      countQuery += ' AND priority = ?';
      countParams.push(priority);
    }

    if (service) {
      countQuery += ' AND service_type = ?';
      countParams.push(service);
    }

    if (search) {
      countQuery += ' AND (full_name LIKE ? OR email LIKE ? OR company LIKE ? OR project_description LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const countResult = await db.prepare(countQuery).bind(...countParams).first();

    return new Response(
      JSON.stringify({
        success: true,
        submissions: submissions.results,
        total: countResult?.total || 0,
        limit,
        offset
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch contacts' }),
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

    const body = await request.json();
    const { id, status, priority, assigned_to, notes } = body;

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Submission ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    if (status) {
      updates.push('status = ?');
      params.push(status);
    }

    if (priority) {
      updates.push('priority = ?');
      params.push(priority);
    }

    if (assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      params.push(assigned_to);
    }

    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    if (status === 'contacted' || status === 'in_progress') {
      updates.push('responded_at = CURRENT_TIMESTAMP');
    }

    params.push(id);

    const query = `UPDATE contact_submissions SET ${updates.join(', ')} WHERE id = ?`;

    await db.prepare(query).bind(...params).run();

    return new Response(
      JSON.stringify({ success: true, message: 'Submission updated successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating contact:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update contact' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Submission ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await db.prepare('DELETE FROM contact_submissions WHERE id = ?').bind(id).run();

    return new Response(
      JSON.stringify({ success: true, message: 'Submission deleted successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error deleting contact:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to delete contact' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
