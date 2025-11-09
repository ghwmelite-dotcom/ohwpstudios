import type { APIRoute } from 'astro';

export const prerender = false;

// GET - Fetch milestones for a project
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
        `SELECT * FROM project_milestones
         WHERE project_id = ?
         ORDER BY display_order ASC, due_date ASC`
      )
      .bind(projectId)
      .all();

    return new Response(
      JSON.stringify({ success: true, milestones: results || [] }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching milestones:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch milestones'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// POST - Create new milestone
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
      description,
      due_date,
      priority,
      deliverables,
      status,
      display_order
    } = data;

    // Validate required fields
    if (!project_id || !title) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Project ID and title are required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create milestone
    const { results } = await db
      .prepare(
        `INSERT INTO project_milestones
         (project_id, title, description, due_date, priority, deliverables, status, display_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
         RETURNING *`
      )
      .bind(
        project_id,
        title,
        description || null,
        due_date || null,
        priority || 'medium',
        deliverables ? JSON.stringify(deliverables) : null,
        status || 'pending',
        display_order || 0
      )
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        milestone: results[0],
        message: 'Milestone created successfully'
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating milestone:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to create milestone'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// PUT - Update milestone
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
      description,
      due_date,
      priority,
      deliverables,
      status,
      display_order,
      completed_at
    } = data;

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Milestone ID is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (due_date !== undefined) { updates.push('due_date = ?'); values.push(due_date); }
    if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
    if (deliverables !== undefined) {
      updates.push('deliverables = ?');
      values.push(JSON.stringify(deliverables));
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
      if (status === 'completed' && !completed_at) {
        updates.push('completed_at = datetime(\'now\')');
      }
    }
    if (completed_at !== undefined) { updates.push('completed_at = ?'); values.push(completed_at); }
    if (display_order !== undefined) { updates.push('display_order = ?'); values.push(display_order); }

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    const query = `UPDATE project_milestones SET ${updates.join(', ')} WHERE id = ? RETURNING *`;

    const { results } = await db.prepare(query).bind(...values).all();

    if (!results || results.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Milestone not found'
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        milestone: results[0],
        message: 'Milestone updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating milestone:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to update milestone'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// DELETE - Delete milestone
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
          error: 'Milestone ID is required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await db
      .prepare('DELETE FROM project_milestones WHERE id = ?')
      .bind(id)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Milestone deleted successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error deleting milestone:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to delete milestone'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
