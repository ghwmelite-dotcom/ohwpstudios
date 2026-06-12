import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Website Grader API - Comprehensive Website Analysis
 * Analyzes performance, SEO, security, and mobile-friendliness
 * Returns scored report with actionable recommendations
 */

interface AnalysisResult {
  url: string;
  scores: {
    overall: number;
    performance: number;
    seo: number;
    security: number;
    mobile: number;
  };
  performance: {
    loadTime: number;
    score: number;
    issues: string[];
    recommendations: string[];
  };
  seo: {
    score: number;
    hasTitle: boolean;
    hasDescription: boolean;
    hasHeadings: boolean;
    hasStructuredData: boolean;
    issues: string[];
    recommendations: string[];
  };
  security: {
    score: number;
    hasSSL: boolean;
    hasSecurityHeaders: boolean;
    issues: string[];
    recommendations: string[];
  };
  mobile: {
    score: number;
    hasViewport: boolean;
    isResponsive: boolean;
    issues: string[];
    recommendations: string[];
  };
  timestamp: string;
  aiRecommendations?: string[];
}

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({
    message: 'Website Grader API',
    method: 'POST required',
    usage: 'Send POST request with { url, email?, name? }'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid request body'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { url, email, name } = data;

    if (!url) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Website URL is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate and normalize URL
    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // Validate URL format
    try {
      new URL(normalizedUrl);
    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid URL format'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Perform comprehensive analysis
    const analysis = await analyzeWebsite(normalizedUrl);

    // AI-written, prioritized action plan (free Cloudflare Workers AI)
    const ai = locals.runtime?.env?.AI;
    if (ai) {
      analysis.aiRecommendations = await getGraderAIRecommendations(analysis, ai);
    }

    // Save lead if email provided
    const db = locals.runtime?.env?.DB;
    if (db && email) {
      await db.prepare(`
        INSERT INTO website_grader_leads (
          url, email, name, overall_score,
          performance_score, seo_score, security_score, mobile_score,
          analysis_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        normalizedUrl,
        email,
        name || 'Anonymous',
        analysis.scores.overall,
        analysis.scores.performance,
        analysis.scores.seo,
        analysis.scores.security,
        analysis.scores.mobile,
        JSON.stringify(analysis)
      ).run();

      // Send email with detailed report if configured
      const RESEND_API_KEY = locals.runtime?.env?.RESEND_API_KEY;
      if (RESEND_API_KEY) {
        await sendAnalysisEmail(analysis, email, name, RESEND_API_KEY);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      analysis
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Website analysis error:', error);

    // Ensure we always return valid JSON
    const errorMessage = error?.message || 'Failed to analyze website';
    const errorResponse = {
      success: false,
      error: errorMessage
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
};

const GRADER_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const GRADER_SCHEMA = {
  type: 'object',
  properties: { recommendations: { type: 'array', items: { type: 'string' } } },
  required: ['recommendations'],
};

// Turn the raw audit into a prioritized, plain-English action plan via Workers AI.
async function getGraderAIRecommendations(analysis: AnalysisResult, ai: any): Promise<string[]> {
  try {
    const issues = [
      ...analysis.performance.issues.map((i) => `Performance: ${i}`),
      ...analysis.seo.issues.map((i) => `SEO: ${i}`),
      ...analysis.security.issues.map((i) => `Security: ${i}`),
      ...analysis.mobile.issues.map((i) => `Mobile: ${i}`),
    ];
    const prompt = `You are a senior web consultant at OhWP Studios reviewing a website audit for ${analysis.url}.

Scores (0-100): Overall ${analysis.scores.overall}, Performance ${analysis.scores.performance}, SEO ${analysis.scores.seo}, Security ${analysis.scores.security}, Mobile ${analysis.scores.mobile}.

Issues found:
${issues.length ? issues.map((i) => `- ${i}`).join('\n') : '- No major issues detected.'}

Write 4-6 prioritized, specific, plain-English recommendations the owner should act on first — most impactful and business-relevant first. Each is one concrete sentence, no jargon, no numbering. Respond as JSON: { "recommendations": ["...", "..."] }.`;

    const result: any = await ai.run(GRADER_MODEL, {
      messages: [
        { role: 'system', content: 'You are a concise, practical senior web consultant. Output only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_schema', json_schema: GRADER_SCHEMA },
      temperature: 0.4,
      max_tokens: 800,
    });

    let parsed: any = result?.response ?? result;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        const s = parsed.indexOf('{');
        const e = parsed.lastIndexOf('}');
        parsed = s !== -1 && e !== -1 ? JSON.parse(parsed.slice(s, e + 1)) : {};
      }
    }
    const recs = parsed?.recommendations;
    return Array.isArray(recs) ? recs.filter((r: any) => typeof r === 'string').slice(0, 6) : [];
  } catch (error) {
    console.error('Grader AI recommendations error:', error);
    return [];
  }
}

async function analyzeWebsite(url: string): Promise<AnalysisResult> {
  const startTime = Date.now();

  try {
    // Fetch website with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'OHWP-Website-Grader/1.0'
      }
    });

    clearTimeout(timeout);
    const loadTime = Date.now() - startTime;
    const html = await response.text();
    const headers = response.headers;

    // Analyze different aspects
    const performance = analyzePerformance(loadTime, html, headers);
    const seo = analyzeSEO(html, url);
    const security = analyzeSecurity(url, headers);
    const mobile = analyzeMobile(html);

    // Calculate overall score
    const overall = Math.round(
      (performance.score + seo.score + security.score + mobile.score) / 4
    );

    return {
      url,
      scores: {
        overall,
        performance: performance.score,
        seo: seo.score,
        security: security.score,
        mobile: mobile.score
      },
      performance,
      seo,
      security,
      mobile,
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    // Return basic analysis with errors
    return {
      url,
      scores: {
        overall: 0,
        performance: 0,
        seo: 0,
        security: 0,
        mobile: 0
      },
      performance: {
        loadTime: 0,
        score: 0,
        issues: ['Failed to load website: ' + error.message],
        recommendations: ['Ensure the website is publicly accessible and not blocking automated requests']
      },
      seo: {
        score: 0,
        hasTitle: false,
        hasDescription: false,
        hasHeadings: false,
        hasStructuredData: false,
        issues: ['Could not analyze SEO'],
        recommendations: []
      },
      security: {
        score: 0,
        hasSSL: url.startsWith('https://'),
        hasSecurityHeaders: false,
        issues: ['Could not analyze security'],
        recommendations: []
      },
      mobile: {
        score: 0,
        hasViewport: false,
        isResponsive: false,
        issues: ['Could not analyze mobile-friendliness'],
        recommendations: []
      },
      timestamp: new Date().toISOString()
    };
  }
}

function analyzePerformance(loadTime: number, html: string, headers: Headers): any {
  let score = 100;
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Load time analysis
  if (loadTime > 3000) {
    score -= 30;
    issues.push(`Slow load time: ${(loadTime / 1000).toFixed(2)}s`);
    recommendations.push('Optimize images and enable compression');
  } else if (loadTime > 2000) {
    score -= 15;
    issues.push(`Moderate load time: ${(loadTime / 1000).toFixed(2)}s`);
    recommendations.push('Consider CDN and browser caching');
  }

  // HTML size analysis
  const htmlSize = new Blob([html]).size;
  if (htmlSize > 500000) {
    score -= 20;
    issues.push('Large HTML size');
    recommendations.push('Minify HTML and remove unused code');
  }

  // Compression check
  if (!headers.get('content-encoding')) {
    score -= 15;
    issues.push('No compression detected');
    recommendations.push('Enable gzip or brotli compression');
  }

  // Caching check
  const cacheControl = headers.get('cache-control');
  if (!cacheControl || cacheControl.includes('no-cache')) {
    score -= 10;
    issues.push('Poor caching configuration');
    recommendations.push('Implement browser caching with proper cache headers');
  }

  return {
    loadTime,
    score: Math.max(0, score),
    issues,
    recommendations
  };
}

function analyzeSEO(html: string, url: string): any {
  let score = 100;
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Title tag
  const hasTitle = /<title[^>]*>([^<]+)<\/title>/i.test(html);
  if (!hasTitle) {
    score -= 25;
    issues.push('Missing title tag');
    recommendations.push('Add a unique, descriptive title tag (50-60 characters)');
  } else {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const titleLength = titleMatch ? titleMatch[1].length : 0;
    if (titleLength > 60 || titleLength < 30) {
      score -= 10;
      issues.push('Title tag length not optimal');
      recommendations.push('Keep title between 30-60 characters for best SEO');
    }
  }

  // Meta description
  const hasDescription = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i.test(html);
  if (!hasDescription) {
    score -= 25;
    issues.push('Missing meta description');
    recommendations.push('Add a compelling meta description (150-160 characters)');
  }

  // Heading structure
  const hasH1 = /<h1[^>]*>/i.test(html);
  const hasHeadings = /<h[2-6][^>]*>/i.test(html);
  if (!hasH1) {
    score -= 15;
    issues.push('Missing H1 heading');
    recommendations.push('Add a clear H1 heading for page topic');
  }
  if (!hasHeadings) {
    score -= 10;
    issues.push('Poor heading structure');
    recommendations.push('Use H2-H6 headings to organize content');
  }

  // Structured data
  const hasStructuredData = /application\/ld\+json|itemscope|itemtype/i.test(html);
  if (!hasStructuredData) {
    score -= 15;
    issues.push('No structured data found');
    recommendations.push('Add JSON-LD structured data for rich snippets');
  }

  // Open Graph tags
  const hasOG = /<meta[^>]*property=["']og:/i.test(html);
  if (!hasOG) {
    score -= 10;
    issues.push('Missing Open Graph tags');
    recommendations.push('Add OG tags for better social media sharing');
  }

  return {
    score: Math.max(0, score),
    hasTitle,
    hasDescription,
    hasHeadings: hasH1 && hasHeadings,
    hasStructuredData,
    issues,
    recommendations
  };
}

function analyzeSecurity(url: string, headers: Headers): any {
  let score = 100;
  const issues: string[] = [];
  const recommendations: string[] = [];

  // SSL/HTTPS
  const hasSSL = url.startsWith('https://');
  if (!hasSSL) {
    score -= 50;
    issues.push('Not using HTTPS');
    recommendations.push('Install SSL certificate and enforce HTTPS');
  }

  // Security headers
  const securityHeaders = [
    { name: 'strict-transport-security', label: 'HSTS', points: 15 },
    { name: 'x-content-type-options', label: 'X-Content-Type-Options', points: 10 },
    { name: 'x-frame-options', label: 'X-Frame-Options', points: 10 },
    { name: 'content-security-policy', label: 'CSP', points: 15 }
  ];

  let hasSecurityHeaders = false;
  securityHeaders.forEach(header => {
    if (!headers.get(header.name)) {
      score -= header.points;
      issues.push(`Missing ${header.label} header`);
      recommendations.push(`Add ${header.label} header for enhanced security`);
    } else {
      hasSecurityHeaders = true;
    }
  });

  return {
    score: Math.max(0, score),
    hasSSL,
    hasSecurityHeaders,
    issues,
    recommendations
  };
}

function analyzeMobile(html: string): any {
  let score = 100;
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Viewport meta tag
  const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);
  if (!hasViewport) {
    score -= 40;
    issues.push('Missing viewport meta tag');
    recommendations.push('Add viewport meta tag for mobile responsiveness');
  }

  // Responsive indicators
  const hasMediaQueries = /@media[^{]*\([^)]*\)/i.test(html);
  const hasFlexbox = /display:\s*flex/i.test(html);
  const hasGrid = /display:\s*grid/i.test(html);
  const isResponsive = hasMediaQueries || hasFlexbox || hasGrid;

  if (!isResponsive) {
    score -= 30;
    issues.push('No responsive design patterns detected');
    recommendations.push('Use CSS media queries or flexbox/grid for responsive layout');
  }

  // Mobile-friendly font sizes
  const hasTinyText = /font-size:\s*[0-9]px/i.test(html);
  if (hasTinyText) {
    score -= 15;
    issues.push('Very small font sizes detected');
    recommendations.push('Use at least 16px base font size for mobile readability');
  }

  // Touch targets
  const hasSmallButtons = /width:\s*[1-3][0-9]px.*height:\s*[1-3][0-9]px/i.test(html);
  if (hasSmallButtons) {
    score -= 15;
    issues.push('Small touch targets detected');
    recommendations.push('Make buttons/links at least 44x44px for easy tapping');
  }

  return {
    score: Math.max(0, score),
    hasViewport,
    isResponsive,
    issues,
    recommendations
  };
}

async function sendAnalysisEmail(analysis: AnalysisResult, email: string, name: string, apiKey: string) {
  try {
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #E3A92B;">Your Website Analysis Report</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Thank you for using our Website Grader! Here's your comprehensive analysis for <strong>${analysis.url}</strong>:</p>

        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Overall Score: ${analysis.scores.overall}/100</h3>
          <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 10px;">
            <strong>⚡ Performance:</strong> ${analysis.scores.performance}/100<br>
            <strong>🔍 SEO:</strong> ${analysis.scores.seo}/100<br>
            <strong>🔒 Security:</strong> ${analysis.scores.security}/100<br>
            <strong>📱 Mobile:</strong> ${analysis.scores.mobile}/100
          </div>
        </div>

        <h3>Top Recommendations:</h3>
        <ul>
          ${[...analysis.performance.recommendations.slice(0, 2),
             ...analysis.seo.recommendations.slice(0, 2),
             ...analysis.security.recommendations.slice(0, 1),
             ...analysis.mobile.recommendations.slice(0, 1)
          ].map(rec => `<li>${rec}</li>`).join('')}
        </ul>

        <div style="background: linear-gradient(135deg, #E3A92B, #1B5E3A); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
          <h3 style="margin-top: 0; color: white;">Want Expert Help?</h3>
          <p>Our team can optimize your website to achieve 90+ scores across all categories.</p>
          <a href="https://ohwpstudios.org/booking" style="display: inline-block; background: white; color: #E3A92B; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;">Book Free Consultation</a>
        </div>

        <p style="color: #6b7280; font-size: 14px;">
          Best regards,<br>
          OHWP Studios Team<br>
          <a href="https://ohwpstudios.org">ohwpstudios.org</a>
        </p>
      </div>
    `;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Website Grader <noreply@ohwpstudios.org>',
        to: [email],
        subject: `Your Website Analysis: ${analysis.scores.overall}/100 - ${analysis.url}`,
        html: emailHtml
      })
    });
  } catch (error) {
    console.error('Error sending analysis email:', error);
  }
}
