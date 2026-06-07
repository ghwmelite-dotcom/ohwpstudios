import type { APIRoute } from 'astro';

export const prerender = false;

interface ProjectEstimateRequest {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  project_description: string;
  project_type: 'web' | 'mobile' | 'both' | 'other';
  timeline_preference: 'asap' | '1-3 months' | '3-6 months' | '6+ months';
  budget_range: 'under 10k' | '10k-25k' | '25k-50k' | '50k-100k' | '100k+';
  website_url?: string;
}

interface AIAnalysis {
  summary: string;
  complexity_assessment: string;
  key_features: string[];
  estimated_cost_min: number;
  estimated_cost_max: number;
  estimated_timeline_weeks: number;
  technology_stack: string[];
  team_composition: {
    role: string;
    count: number;
  }[];
  team_size_needed: number;
  risk_level: 'low' | 'medium' | 'high';
  risk_factors: string[];
  recommendations: string[];
  next_steps: string[];
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data: ProjectEstimateRequest = await request.json();

    // Unique token for the shareable /proposal/<token> page
    const shareToken = crypto.randomUUID().replace(/-/g, '').slice(0, 12);

    // Validate required fields
    if (!data.name || !data.email || !data.project_description || !data.project_type || !data.timeline_preference || !data.budget_range) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid email format'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate the analysis with Cloudflare Workers AI (free), falling back to a heuristic estimate.
    const ai = (locals as any).runtime?.env?.AI;
    const aiAnalysis = ai ? await getWorkersAIAnalysis(data, ai) : getFallbackEstimate(data);

    // Store in the database
    const db = (locals as any).runtime?.env?.DB;
    let insertedId: number | undefined;
    if (db) {
      const result = await db.prepare(`
        INSERT INTO project_estimates (
          name, email, company, phone,
          project_description, project_type, timeline_preference, budget_range,
          ai_analysis, estimated_cost_min, estimated_cost_max,
          estimated_timeline_weeks, technology_stack, team_size_needed,
          risk_level, share_token, website_url, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
      `).bind(
        data.name,
        data.email,
        data.company || null,
        data.phone || null,
        data.project_description,
        data.project_type,
        data.timeline_preference,
        data.budget_range,
        JSON.stringify(aiAnalysis),
        aiAnalysis.estimated_cost_min,
        aiAnalysis.estimated_cost_max,
        aiAnalysis.estimated_timeline_weeks,
        JSON.stringify(aiAnalysis.technology_stack),
        aiAnalysis.team_size_needed,
        aiAnalysis.risk_level,
        shareToken,
        data.website_url || null
      ).run();
      insertedId = result.meta.last_row_id;
    }

    return new Response(JSON.stringify({
      success: true,
      id: insertedId,
      share_token: shareToken,
      ...aiAnalysis
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error processing project estimate:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Best free, JSON-mode-capable Workers AI model for structured reasoning.
const WORKERS_AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    complexity_assessment: { type: 'string' },
    key_features: { type: 'array', items: { type: 'string' } },
    estimated_cost_min: { type: 'number' },
    estimated_cost_max: { type: 'number' },
    estimated_timeline_weeks: { type: 'number' },
    technology_stack: { type: 'array', items: { type: 'string' } },
    team_composition: {
      type: 'array',
      items: { type: 'object', properties: { role: { type: 'string' }, count: { type: 'number' } }, required: ['role', 'count'] },
    },
    team_size_needed: { type: 'number' },
    risk_level: { type: 'string' },
    risk_factors: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
    next_steps: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'estimated_cost_min', 'estimated_cost_max', 'estimated_timeline_weeks', 'technology_stack', 'team_size_needed', 'risk_level', 'recommendations', 'next_steps'],
};

async function getWorkersAIAnalysis(data: ProjectEstimateRequest, ai: any): Promise<AIAnalysis> {
  const systemPrompt = `You are an expert software project estimator with 15+ years of experience in web and mobile development.
Your role is to analyze project requirements and provide accurate, realistic estimates for cost, timeline, team size, and technology recommendations.

You must respond with a valid JSON object (no markdown formatting, no code blocks) containing these exact fields:
{
  "summary": "2-3 paragraph analysis of the project",
  "complexity_assessment": "low/medium/high/very high with explanation",
  "key_features": ["feature 1", "feature 2", ...],
  "estimated_cost_min": number (in dollars),
  "estimated_cost_max": number (in dollars),
  "estimated_timeline_weeks": number,
  "technology_stack": ["tech 1", "tech 2", ...],
  "team_composition": [{"role": "role name", "count": number}, ...],
  "team_size_needed": number (total team members),
  "risk_level": "low/medium/high",
  "risk_factors": ["risk 1", "risk 2", ...],
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "next_steps": ["step 1", "step 2", ...]
}

Consider these factors in your analysis:
- Project type and complexity
- Number and sophistication of features described
- Integration requirements
- User base and scalability needs
- Timeline constraints
- Budget constraints
- Industry best practices
- Technology trends and recommendations

Be realistic but optimistic. Provide ranges that account for uncertainty. Consider the client's budget range when making estimates but don't artificially inflate or deflate - be honest about what's feasible.`;

  const userPrompt = `Please analyze this project and provide a comprehensive estimate:

Project Type: ${data.project_type}
Timeline Preference: ${data.timeline_preference}
Budget Range: ${data.budget_range}

Project Description:
${data.project_description}

Client Information:
- Name: ${data.name}
- Email: ${data.email}
${data.company ? `- Company: ${data.company}` : ''}
${data.website_url ? `\nExisting website: ${data.website_url} — factor in a redesign/migration and audit-style improvements when scoping the work.` : ''}

Provide a detailed analysis considering the project scope, complexity, and the client's constraints.`;

  try {
    const result: any = await ai.run(WORKERS_AI_MODEL, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_schema', json_schema: ANALYSIS_SCHEMA },
      temperature: 0.4,
      max_tokens: 2048,
    });

    // JSON mode returns the structured object (or a JSON string) on `response`.
    let analysis: any = result?.response ?? result;
    if (typeof analysis === 'string') {
      try {
        analysis = JSON.parse(analysis);
      } catch {
        const s = analysis.indexOf('{');
        const e = analysis.lastIndexOf('}');
        if (s !== -1 && e !== -1) analysis = JSON.parse(analysis.slice(s, e + 1));
        else throw new Error('Could not parse AI response as JSON');
      }
    }
    if (!analysis || typeof analysis !== 'object') {
      throw new Error('Empty AI response');
    }

    // Validate, filling any gaps from the heuristic baseline so output is always complete.
    const fb = getFallbackEstimate(data);
    return {
      summary: analysis.summary || fb.summary,
      complexity_assessment: analysis.complexity_assessment || fb.complexity_assessment,
      key_features: Array.isArray(analysis.key_features) && analysis.key_features.length ? analysis.key_features : fb.key_features,
      estimated_cost_min: typeof analysis.estimated_cost_min === 'number' ? analysis.estimated_cost_min : fb.estimated_cost_min,
      estimated_cost_max: typeof analysis.estimated_cost_max === 'number' ? analysis.estimated_cost_max : fb.estimated_cost_max,
      estimated_timeline_weeks: typeof analysis.estimated_timeline_weeks === 'number' ? analysis.estimated_timeline_weeks : fb.estimated_timeline_weeks,
      technology_stack: Array.isArray(analysis.technology_stack) && analysis.technology_stack.length ? analysis.technology_stack : fb.technology_stack,
      team_composition: Array.isArray(analysis.team_composition) && analysis.team_composition.length ? analysis.team_composition : fb.team_composition,
      team_size_needed: typeof analysis.team_size_needed === 'number' ? analysis.team_size_needed : fb.team_size_needed,
      risk_level: ['low', 'medium', 'high'].includes(analysis.risk_level) ? analysis.risk_level : fb.risk_level,
      risk_factors: Array.isArray(analysis.risk_factors) && analysis.risk_factors.length ? analysis.risk_factors : fb.risk_factors,
      recommendations: Array.isArray(analysis.recommendations) && analysis.recommendations.length ? analysis.recommendations : fb.recommendations,
      next_steps: Array.isArray(analysis.next_steps) && analysis.next_steps.length ? analysis.next_steps : fb.next_steps,
    };
  } catch (error) {
    console.error('Workers AI error:', error);
    return getFallbackEstimate(data);
  }
}

function getFallbackEstimate(data: ProjectEstimateRequest): AIAnalysis {
  // Provide reasonable fallback estimates based on project type and budget
  const budgetMap = {
    'under 10k': { min: 5000, max: 10000 },
    '10k-25k': { min: 10000, max: 25000 },
    '25k-50k': { min: 25000, max: 50000 },
    '50k-100k': { min: 50000, max: 100000 },
    '100k+': { min: 100000, max: 200000 }
  };

  const budget = budgetMap[data.budget_range];

  const timelineMap = {
    'asap': 8,
    '1-3 months': 10,
    '3-6 months': 20,
    '6+ months': 32
  };

  const baseStack = data.project_type === 'web'
    ? ['React', 'Node.js', 'PostgreSQL', 'AWS']
    : data.project_type === 'mobile'
    ? ['React Native', 'Node.js', 'Firebase']
    : ['React', 'React Native', 'Node.js', 'PostgreSQL', 'AWS'];

  return {
    summary: `Based on your ${data.project_type} project requirements, this appears to be a ${
      budget.min < 25000 ? 'small to medium' : budget.min < 75000 ? 'medium to large' : 'large-scale'
    } project. The estimate provided considers your timeline preference of ${data.timeline_preference} and budget range of ${data.budget_range}.`,
    complexity_assessment: budget.min < 25000 ? 'Medium complexity' : budget.min < 75000 ? 'High complexity' : 'Very high complexity',
    key_features: ['User authentication', 'Database management', 'Responsive design', 'API integration'],
    estimated_cost_min: budget.min,
    estimated_cost_max: budget.max,
    estimated_timeline_weeks: timelineMap[data.timeline_preference],
    technology_stack: baseStack,
    team_composition: [
      { role: 'Project Manager', count: 1 },
      { role: 'Full-Stack Developer', count: budget.min < 50000 ? 1 : 2 },
      { role: 'UI/UX Designer', count: 1 },
      { role: 'QA Engineer', count: 1 }
    ],
    team_size_needed: budget.min < 50000 ? 3 : 5,
    risk_level: data.timeline_preference === 'asap' ? 'high' : 'medium',
    risk_factors: [
      'Timeline constraints may impact feature scope',
      'Requirements need to be clearly defined',
      'Third-party integration complexity'
    ],
    recommendations: [
      'Start with an MVP to validate core features',
      'Plan for iterative development cycles',
      'Ensure clear communication channels',
      'Set up proper testing environments'
    ],
    next_steps: [
      'Schedule a discovery call to discuss requirements in detail',
      'Define project scope and deliverables',
      'Create detailed project roadmap',
      'Sign agreement and begin development'
    ]
  };
}
