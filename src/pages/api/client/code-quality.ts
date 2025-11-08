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

// Calculate overall health score from metrics
function calculateHealthScore(metrics: any): number {
  if (!metrics) return 0;

  const weights = {
    code_coverage: 0.20,
    security: 0.30,
    performance: 0.25,
    test_pass_rate: 0.25
  };

  const score =
    (metrics.code_coverage_percent || 0) * weights.code_coverage +
    (metrics.security_score || 0) * weights.security +
    (metrics.performance_score || 0) * weights.performance +
    (metrics.test_pass_rate || 0) * weights.test_pass_rate;

  return Math.round(score);
}

// GET - Fetch code quality metrics for a specific project
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
    const user = await verifyClientToken(db, token);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get project_id from query params
    const projectId = url.searchParams.get('project_id');
    if (!projectId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify the project belongs to this client
    const project = await db
      .prepare('SELECT id, client_id FROM client_projects WHERE id = ?')
      .bind(projectId)
      .first();

    if (!project || project.client_id !== user.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch latest metrics
    const latestMetrics = await db
      .prepare(`
        SELECT *
        FROM code_quality_metrics
        WHERE project_id = ?
        ORDER BY metric_date DESC, created_at DESC
        LIMIT 1
      `)
      .bind(projectId)
      .first();

    // Fetch historical metrics (last 30 days for trends)
    const historicalMetrics = await db
      .prepare(`
        SELECT
          metric_date,
          code_coverage_percent,
          security_score,
          performance_score,
          test_pass_rate,
          technical_debt_hours
        FROM code_quality_metrics
        WHERE project_id = ?
        ORDER BY metric_date DESC
        LIMIT 30
      `)
      .bind(projectId)
      .all();

    // Fetch recent deployments
    const recentDeployments = await db
      .prepare(`
        SELECT *
        FROM deployment_history
        WHERE project_id = ?
        ORDER BY deployed_at DESC
        LIMIT 5
      `)
      .bind(projectId)
      .all();

    // Calculate health score if metrics exist
    let healthScore = 0;
    let trend = null;

    if (latestMetrics) {
      healthScore = calculateHealthScore(latestMetrics);

      // Calculate trend (compare with week ago)
      if (historicalMetrics.results && historicalMetrics.results.length > 7) {
        const weekAgoMetrics = historicalMetrics.results[7];
        const weekAgoScore = calculateHealthScore(weekAgoMetrics);
        const diff = healthScore - weekAgoScore;

        trend = {
          direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
          value: Math.abs(diff)
        };
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        metrics: {
          latest: latestMetrics || null,
          historical: historicalMetrics.results || [],
          deployments: recentDeployments.results || [],
          healthScore,
          trend
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching code quality metrics:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch code quality metrics' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
