import type { APIRoute } from 'astro';

export const prerender = false;

// GET - Fetch all job applications
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify token
    const adminResult = await db.prepare(
      'SELECT * FROM admins WHERE token = ?'
    ).bind(token).first();

    if (!adminResult) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all applications, sorted by most recent first
    const applications = await db.prepare(`
      SELECT * FROM job_applications
      ORDER BY created_at DESC
    `).all();

    return new Response(
      JSON.stringify({
        success: true,
        applications: applications.results || []
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching applications:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch applications'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// PUT - Update application status
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify token
    const adminResult = await db.prepare(
      'SELECT * FROM admins WHERE token = ?'
    ).bind(token).first();

    if (!adminResult) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();
    const { id, status } = data;

    if (!id || !status) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing id or status' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Valid statuses
    const validStatuses = ['new', 'reviewing', 'interviewing', 'rejected', 'accepted'];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid status' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update application status
    await db.prepare(`
      UPDATE job_applications
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(status, id).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Application status updated'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating application:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to update application'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// DELETE - Delete application
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify token
    const adminResult = await db.prepare(
      'SELECT * FROM admins WHERE token = ?'
    ).bind(token).first();

    if (!adminResult) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing application id' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete application
    await db.prepare(
      'DELETE FROM job_applications WHERE id = ?'
    ).bind(id).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Application deleted'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error deleting application:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to delete application'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
