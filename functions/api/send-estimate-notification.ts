interface Env {
  RESEND_API_KEY: string;
}

interface EstimateNotification {
  estimateId: number;
  data: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
    project_description: string;
    project_type: string;
    timeline_preference: string;
    budget_range: string;
  };
  analysis: {
    estimated_cost_min: number;
    estimated_cost_max: number;
    estimated_timeline_weeks: number;
    technology_stack: string[];
    team_size_needed: number;
    risk_level: string;
    complexity_assessment: string;
  };
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const notification: EstimateNotification = await context.request.json();

    // Send email using Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${context.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'notifications@yourdomain.com', // Update with your verified domain
        to: ['admin@yourdomain.com'], // Update with your admin email
        subject: `New Project Estimate Request from ${notification.data.name}`,
        html: generateEmailHTML(notification)
      })
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.text();
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email notification');
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Notification sent successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to send notification',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

function generateEmailHTML(notification: EstimateNotification): string {
  const { data, analysis, estimateId } = notification;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Project Estimate Request</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #9333EA, #3B82F6);
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      margin: -30px -30px 20px -30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 8px;
    }
    .badge-new {
      background-color: #10B981;
      color: white;
    }
    .section {
      margin-bottom: 25px;
      padding-bottom: 20px;
      border-bottom: 1px solid #e5e7eb;
    }
    .section:last-child {
      border-bottom: none;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 12px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 8px;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
    }
    .info-value {
      color: #1f2937;
    }
    .description-box {
      background-color: #f9fafb;
      border-left: 4px solid #9333EA;
      padding: 15px;
      border-radius: 4px;
      margin-top: 10px;
    }
    .estimate-highlight {
      background: linear-gradient(135deg, #f3e8ff, #dbeafe);
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .estimate-value {
      font-size: 28px;
      font-weight: 700;
      color: #7c3aed;
      margin: 8px 0;
    }
    .tech-stack {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 10px;
    }
    .tech-badge {
      background-color: #e0e7ff;
      color: #4338ca;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 500;
    }
    .risk-badge {
      padding: 6px 14px;
      border-radius: 16px;
      font-weight: 600;
      display: inline-block;
      margin-top: 8px;
    }
    .risk-low {
      background-color: #d1fae5;
      color: #065f46;
    }
    .risk-medium {
      background-color: #fef3c7;
      color: #92400e;
    }
    .risk-high {
      background-color: #fee2e2;
      color: #991b1b;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #9333EA, #3B82F6);
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Project Estimate Request</h1>
      <span class="badge badge-new">NEW LEAD</span>
    </div>

    <div class="section">
      <div class="section-title">Contact Information</div>
      <div class="info-grid">
        <div class="info-label">Name:</div>
        <div class="info-value">${data.name}</div>

        <div class="info-label">Email:</div>
        <div class="info-value"><a href="mailto:${data.email}">${data.email}</a></div>

        ${data.company ? `
        <div class="info-label">Company:</div>
        <div class="info-value">${data.company}</div>
        ` : ''}

        ${data.phone ? `
        <div class="info-label">Phone:</div>
        <div class="info-value"><a href="tel:${data.phone}">${data.phone}</a></div>
        ` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Project Details</div>
      <div class="info-grid">
        <div class="info-label">Project Type:</div>
        <div class="info-value">${formatProjectType(data.project_type)}</div>

        <div class="info-label">Timeline:</div>
        <div class="info-value">${data.timeline_preference}</div>

        <div class="info-label">Budget Range:</div>
        <div class="info-value">${formatBudget(data.budget_range)}</div>
      </div>

      <div style="margin-top: 15px;">
        <div class="info-label">Project Description:</div>
        <div class="description-box">
          ${data.project_description.replace(/\n/g, '<br>')}
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">AI-Generated Estimate</div>

      <div class="estimate-highlight">
        <div style="color: #6b7280; font-size: 14px; font-weight: 600;">ESTIMATED COST</div>
        <div class="estimate-value">
          $${analysis.estimated_cost_min.toLocaleString()} - $${analysis.estimated_cost_max.toLocaleString()}
        </div>
      </div>

      <div class="info-grid">
        <div class="info-label">Timeline:</div>
        <div class="info-value">${analysis.estimated_timeline_weeks} weeks</div>

        <div class="info-label">Team Size:</div>
        <div class="info-value">${analysis.team_size_needed} people</div>

        <div class="info-label">Complexity:</div>
        <div class="info-value">${analysis.complexity_assessment}</div>

        <div class="info-label">Risk Level:</div>
        <div class="info-value">
          <span class="risk-badge risk-${analysis.risk_level}">${analysis.risk_level.toUpperCase()}</span>
        </div>
      </div>

      ${analysis.technology_stack && analysis.technology_stack.length > 0 ? `
      <div style="margin-top: 20px;">
        <div class="info-label">Recommended Tech Stack:</div>
        <div class="tech-stack">
          ${analysis.technology_stack.map(tech => `<span class="tech-badge">${tech}</span>`).join('')}
        </div>
      </div>
      ` : ''}
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${getAdminUrl()}/admin/estimates?id=${estimateId}" class="cta-button">
        View Full Details in Admin Dashboard
      </a>
    </div>

    <div class="footer">
      <p>This email was automatically generated when a visitor submitted a project estimate request.</p>
      <p>Estimate ID: #${estimateId} | Generated by AI Project Estimator</p>
    </div>
  </div>
</body>
</html>
  `;
}

function formatProjectType(type: string): string {
  const types: Record<string, string> = {
    'web': 'Web Application',
    'mobile': 'Mobile Application',
    'both': 'Web & Mobile',
    'other': 'Other'
  };
  return types[type] || type;
}

function formatBudget(budget: string): string {
  const budgets: Record<string, string> = {
    'under 10k': 'Under $10,000',
    '10k-25k': '$10,000 - $25,000',
    '25k-50k': '$25,000 - $50,000',
    '50k-100k': '$50,000 - $100,000',
    '100k+': '$100,000+'
  };
  return budgets[budget] || budget;
}

function getAdminUrl(): string {
  // In production, this would be your actual domain
  // For now, return a placeholder that will be replaced with actual domain
  return 'https://yourdomain.com';
}
