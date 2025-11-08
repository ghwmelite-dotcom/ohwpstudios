import type { APIRoute } from 'astro';

export const prerender = false;

// Verify admin token
async function verifyAdminToken(db: any, token: string) {
  const admin = await db
    .prepare('SELECT * FROM admins WHERE token = ? AND token_expires_at > datetime("now")')
    .bind(token)
    .first();

  return admin;
}

// GET - Fetch all code quality metrics for all projects (admin view)
export const GET: APIRoute = async ({ request, url, locals }) => {
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
    const admin = await verifyAdminToken(db, token);

    if (!admin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get project_id from query params (optional - if provided, fetch for specific project)
    const projectId = url.searchParams.get('project_id');

    if (projectId) {
      // Fetch metrics for specific project
      const metrics = await db
        .prepare(`
          SELECT m.*, p.project_name, c.company_name
          FROM code_quality_metrics m
          LEFT JOIN client_projects p ON m.project_id = p.id
          LEFT JOIN client_users c ON p.client_id = c.id
          WHERE m.project_id = ?
          ORDER BY m.metric_date DESC, m.created_at DESC
        `)
        .bind(projectId)
        .all();

      return new Response(
        JSON.stringify({
          success: true,
          metrics: metrics.results || []
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      // Fetch latest metrics for all projects
      const metricsData = await db
        .prepare(`
          SELECT m.*, p.project_name, p.status as project_status, c.company_name
          FROM code_quality_metrics m
          INNER JOIN (
            SELECT project_id, MAX(metric_date) as max_date
            FROM code_quality_metrics
            GROUP BY project_id
          ) latest ON m.project_id = latest.project_id AND m.metric_date = latest.max_date
          LEFT JOIN client_projects p ON m.project_id = p.id
          LEFT JOIN client_users c ON p.client_id = c.id
          ORDER BY m.metric_date DESC
        `)
        .all();

      return new Response(
        JSON.stringify({
          success: true,
          metrics: metricsData.results || []
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Error fetching code quality metrics:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch code quality metrics' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST - Add new code quality metrics
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
    const admin = await verifyAdminToken(db, token);

    if (!admin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.project_id || !data.metric_date) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project ID and metric date are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Insert new metrics
    const result = await db
      .prepare(`
        INSERT INTO code_quality_metrics (
          project_id, metric_date,
          code_coverage_percent, security_score, performance_score, test_pass_rate,
          total_tests, passing_tests, failing_tests,
          code_quality_grade, technical_debt_hours,
          vulnerabilities_critical, vulnerabilities_high, vulnerabilities_medium, vulnerabilities_low,
          last_deployment_at, deployment_status, deployment_duration_seconds,
          uptime_percent, response_time_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        data.project_id,
        data.metric_date,
        data.code_coverage_percent || 0,
        data.security_score || 0,
        data.performance_score || 0,
        data.test_pass_rate || 0,
        data.total_tests || 0,
        data.passing_tests || 0,
        data.failing_tests || 0,
        data.code_quality_grade || 'C',
        data.technical_debt_hours || 0,
        data.vulnerabilities_critical || 0,
        data.vulnerabilities_high || 0,
        data.vulnerabilities_medium || 0,
        data.vulnerabilities_low || 0,
        data.last_deployment_at || null,
        data.deployment_status || 'success',
        data.deployment_duration_seconds || 0,
        data.uptime_percent || 100.0,
        data.response_time_ms || 0
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Code quality metrics added successfully',
        id: result.meta.last_row_id
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error adding code quality metrics:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to add code quality metrics' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT - Update existing code quality metrics
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
    const admin = await verifyAdminToken(db, token);

    if (!admin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Metric ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update metrics
    await db
      .prepare(`
        UPDATE code_quality_metrics
        SET
          metric_date = ?,
          code_coverage_percent = ?,
          security_score = ?,
          performance_score = ?,
          test_pass_rate = ?,
          total_tests = ?,
          passing_tests = ?,
          failing_tests = ?,
          code_quality_grade = ?,
          technical_debt_hours = ?,
          vulnerabilities_critical = ?,
          vulnerabilities_high = ?,
          vulnerabilities_medium = ?,
          vulnerabilities_low = ?,
          last_deployment_at = ?,
          deployment_status = ?,
          deployment_duration_seconds = ?,
          uptime_percent = ?,
          response_time_ms = ?
        WHERE id = ?
      `)
      .bind(
        data.metric_date,
        data.code_coverage_percent || 0,
        data.security_score || 0,
        data.performance_score || 0,
        data.test_pass_rate || 0,
        data.total_tests || 0,
        data.passing_tests || 0,
        data.failing_tests || 0,
        data.code_quality_grade || 'C',
        data.technical_debt_hours || 0,
        data.vulnerabilities_critical || 0,
        data.vulnerabilities_high || 0,
        data.vulnerabilities_medium || 0,
        data.vulnerabilities_low || 0,
        data.last_deployment_at || null,
        data.deployment_status || 'success',
        data.deployment_duration_seconds || 0,
        data.uptime_percent || 100.0,
        data.response_time_ms || 0,
        data.id
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Code quality metrics updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating code quality metrics:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update code quality metrics' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE - Remove old metrics
export const DELETE: APIRoute = async ({ request, url, locals }) => {
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
    const admin = await verifyAdminToken(db, token);

    if (!admin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Metric ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await db
      .prepare('DELETE FROM code_quality_metrics WHERE id = ?')
      .bind(id)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Code quality metrics deleted successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error deleting code quality metrics:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to delete code quality metrics' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
