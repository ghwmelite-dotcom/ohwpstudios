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

// Generate realistic mock data for a project
function generateMockMetrics(projectId: number, daysAgo: number = 0) {
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - daysAgo);
  const metricDate = baseDate.toISOString().split('T')[0];

  // Generate realistic scores with some variance
  const baseCoverage = 70 + Math.random() * 25; // 70-95%
  const baseSecurity = 75 + Math.random() * 20; // 75-95%
  const basePerformance = 65 + Math.random() * 30; // 65-95%
  const baseTestPassRate = 85 + Math.random() * 14; // 85-99%

  const totalTests = Math.floor(150 + Math.random() * 200); // 150-350 tests
  const passingTests = Math.floor(totalTests * (baseTestPassRate / 100));
  const failingTests = totalTests - passingTests;

  // Calculate grade based on overall scores
  const avgScore = (baseCoverage + baseSecurity + basePerformance + baseTestPassRate) / 4;
  let grade = 'C';
  if (avgScore >= 90) grade = 'A+';
  else if (avgScore >= 85) grade = 'A';
  else if (avgScore >= 75) grade = 'B';
  else if (avgScore >= 65) grade = 'C';
  else if (avgScore >= 50) grade = 'D';
  else grade = 'F';

  // Security vulnerabilities - fewer is better
  const criticalVulns = Math.random() < 0.8 ? 0 : Math.floor(Math.random() * 3);
  const highVulns = Math.floor(Math.random() * 5);
  const mediumVulns = Math.floor(Math.random() * 12);
  const lowVulns = Math.floor(Math.random() * 20);

  // Technical debt - related to code quality
  const techDebt = avgScore >= 80 ? Math.random() * 15 : Math.random() * 40;

  // Uptime and performance
  const uptime = 98 + Math.random() * 2; // 98-100%
  const responseTime = Math.floor(50 + Math.random() * 150); // 50-200ms

  return {
    project_id: projectId,
    metric_date: metricDate,
    code_coverage_percent: Math.round(baseCoverage),
    security_score: Math.round(baseSecurity),
    performance_score: Math.round(basePerformance),
    test_pass_rate: Math.round(baseTestPassRate),
    total_tests: totalTests,
    passing_tests: passingTests,
    failing_tests: failingTests,
    code_quality_grade: grade,
    technical_debt_hours: Math.round(techDebt * 10) / 10,
    vulnerabilities_critical: criticalVulns,
    vulnerabilities_high: highVulns,
    vulnerabilities_medium: mediumVulns,
    vulnerabilities_low: lowVulns,
    last_deployment_at: baseDate.toISOString(),
    deployment_status: Math.random() > 0.1 ? 'success' : 'failed',
    deployment_duration_seconds: Math.floor(60 + Math.random() * 240), // 60-300 seconds
    uptime_percent: Math.round(uptime * 100) / 100,
    response_time_ms: responseTime
  };
}

// Generate deployment history
function generateDeploymentHistory(projectId: number, count: number = 5) {
  const deployments = [];
  const branches = ['main', 'develop', 'feature/improvements', 'hotfix/critical'];
  const commitMessages = [
    'Fix critical bug in authentication',
    'Improve performance on dashboard',
    'Add new feature for user management',
    'Update dependencies to latest versions',
    'Refactor code for better maintainability',
    'Fix security vulnerability in API',
    'Optimize database queries',
    'Update UI components',
    'Add unit tests for new features',
    'Deploy production hotfix'
  ];

  for (let i = 0; i < count; i++) {
    const daysAgo = i * 2; // Deploy every 2 days
    const deployDate = new Date();
    deployDate.setDate(deployDate.getDate() - daysAgo);

    const status = Math.random() > 0.15 ? 'success' : (Math.random() > 0.5 ? 'failed' : 'rolled_back');

    deployments.push({
      project_id: projectId,
      deployed_at: deployDate.toISOString(),
      deployed_by: Math.random() > 0.3 ? 'admin' : 'automated',
      version: `v1.${10 - i}.${Math.floor(Math.random() * 10)}`,
      branch: branches[Math.floor(Math.random() * branches.length)],
      status: status,
      duration_seconds: Math.floor(60 + Math.random() * 240),
      commit_message: commitMessages[Math.floor(Math.random() * commitMessages.length)]
    });
  }

  return deployments;
}

// POST - Generate mock data for all projects or specific project
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
    const projectId = data.project_id;
    const days = data.days || 30; // Generate metrics for last N days

    // Get projects to generate data for
    let projects = [];
    if (projectId) {
      // Generate for specific project
      const project = await db
        .prepare('SELECT id FROM client_projects WHERE id = ?')
        .bind(projectId)
        .first();

      if (!project) {
        return new Response(
          JSON.stringify({ success: false, error: 'Project not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      projects = [project];
    } else {
      // Generate for all projects
      const result = await db
        .prepare('SELECT id FROM client_projects LIMIT 10')
        .all();

      projects = result.results || [];
    }

    let totalMetricsCreated = 0;
    let totalDeploymentsCreated = 0;

    // Generate data for each project
    for (const project of projects) {
      // Generate metrics for last N days (one per week)
      const metricsToGenerate = Math.min(Math.ceil(days / 7), 8);

      for (let i = 0; i < metricsToGenerate; i++) {
        const daysAgo = i * 7;
        const metrics = generateMockMetrics(project.id, daysAgo);

        await db
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
            metrics.project_id,
            metrics.metric_date,
            metrics.code_coverage_percent,
            metrics.security_score,
            metrics.performance_score,
            metrics.test_pass_rate,
            metrics.total_tests,
            metrics.passing_tests,
            metrics.failing_tests,
            metrics.code_quality_grade,
            metrics.technical_debt_hours,
            metrics.vulnerabilities_critical,
            metrics.vulnerabilities_high,
            metrics.vulnerabilities_medium,
            metrics.vulnerabilities_low,
            metrics.last_deployment_at,
            metrics.deployment_status,
            metrics.deployment_duration_seconds,
            metrics.uptime_percent,
            metrics.response_time_ms
          )
          .run();

        totalMetricsCreated++;
      }

      // Generate deployment history
      const deployments = generateDeploymentHistory(project.id, 8);
      for (const deployment of deployments) {
        await db
          .prepare(`
            INSERT INTO deployment_history (
              project_id, deployed_at, deployed_by, version, branch,
              status, duration_seconds, commit_message
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            deployment.project_id,
            deployment.deployed_at,
            deployment.deployed_by,
            deployment.version,
            deployment.branch,
            deployment.status,
            deployment.duration_seconds,
            deployment.commit_message
          )
          .run();

        totalDeploymentsCreated++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mock data generated successfully',
        stats: {
          projects: projects.length,
          metrics_created: totalMetricsCreated,
          deployments_created: totalDeploymentsCreated
        }
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error generating mock data:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to generate mock data' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
