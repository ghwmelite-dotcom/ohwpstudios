import type { APIRoute } from 'astro';

export const prerender = false;

interface AuditResult {
  url: string;
  performanceScore: number;
  seoScore: number;
  accessibilityScore: number;
  securityScore: number;
  overallScore: number;
  metrics: {
    performance: any;
    seo: any;
    accessibility: any;
    security: any;
  };
  recommendations: string[];
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { url, email, name } = await request.json();

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
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid URL format'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Perform the audit
    const auditResult = await performWebsiteAudit(normalizedUrl);

    // Store in database
    const db = locals.runtime.env.DB;
    const clientIp = request.headers.get('cf-connecting-ip') ||
                     request.headers.get('x-forwarded-for') ||
                     'unknown';

    await db.prepare(`
      INSERT INTO website_audits (
        url, visitor_email, visitor_name,
        performance_score, speed_index, largest_contentful_paint,
        total_blocking_time, cumulative_layout_shift,
        seo_score, has_meta_description, has_title_tag,
        is_mobile_friendly, has_sitemap,
        accessibility_score, color_contrast_issues,
        missing_alt_tags, wcag_compliance_level,
        security_score, has_ssl, has_https, security_headers_count,
        overall_score, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      auditResult.url,
      email || null,
      name || null,
      auditResult.performanceScore,
      auditResult.metrics.performance.speedIndex,
      auditResult.metrics.performance.largestContentfulPaint,
      auditResult.metrics.performance.totalBlockingTime,
      auditResult.metrics.performance.cumulativeLayoutShift,
      auditResult.seoScore,
      auditResult.metrics.seo.hasMetaDescription,
      auditResult.metrics.seo.hasTitleTag,
      auditResult.metrics.seo.isMobileFriendly,
      auditResult.metrics.seo.hasSitemap,
      auditResult.accessibilityScore,
      auditResult.metrics.accessibility.colorContrastIssues,
      auditResult.metrics.accessibility.missingAltTags,
      auditResult.metrics.accessibility.wcagLevel,
      auditResult.securityScore,
      auditResult.metrics.security.hasSSL,
      auditResult.metrics.security.hasHTTPS,
      auditResult.metrics.security.securityHeadersCount,
      auditResult.overallScore,
      clientIp
    ).run();

    return new Response(JSON.stringify({
      success: true,
      result: auditResult
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Website audit error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to audit website',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function performWebsiteAudit(url: string): Promise<AuditResult> {
  const startTime = performance.now();

  // Fetch the website with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  let response: Response;
  let html: string;
  let fetchTime: number;

  try {
    const fetchStart = performance.now();
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Hodges-Co-Website-Auditor/1.0'
      }
    });
    fetchTime = performance.now() - fetchStart;
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    html = await response.text();
  } catch (error) {
    clearTimeout(timeout);
    throw new Error(`Failed to fetch website: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Parse HTML
  const doc = parseHTML(html);

  // 1. PERFORMANCE METRICS
  const performanceMetrics = analyzePerformance(response, html, fetchTime);

  // 2. SEO METRICS
  const seoMetrics = analyzeSEO(doc, url);

  // 3. ACCESSIBILITY METRICS
  const accessibilityMetrics = analyzeAccessibility(doc);

  // 4. SECURITY METRICS
  const securityMetrics = analyzeSecurity(response, url);

  // Calculate scores (0-100)
  const performanceScore = performanceMetrics.score;
  const seoScore = seoMetrics.score;
  const accessibilityScore = accessibilityMetrics.score;
  const securityScore = securityMetrics.score;

  const overallScore = Math.round(
    (performanceScore + seoScore + accessibilityScore + securityScore) / 4
  );

  // Generate recommendations
  const recommendations = generateRecommendations({
    performance: performanceMetrics,
    seo: seoMetrics,
    accessibility: accessibilityMetrics,
    security: securityMetrics
  });

  return {
    url,
    performanceScore,
    seoScore,
    accessibilityScore,
    securityScore,
    overallScore,
    metrics: {
      performance: performanceMetrics,
      seo: seoMetrics,
      accessibility: accessibilityMetrics,
      security: securityMetrics
    },
    recommendations
  };
}

function parseHTML(html: string) {
  // Simple HTML parser (we can't use DOMParser in Workers)
  return {
    getTitle: () => {
      const match = html.match(/<title[^>]*>(.*?)<\/title>/i);
      return match ? match[1] : '';
    },
    getMetaDescription: () => {
      const match = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
      return match ? match[1] : '';
    },
    getMetaTag: (name: string) => {
      const regex = new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']+)["']`, 'i');
      const match = html.match(regex);
      return match ? match[1] : null;
    },
    getImages: () => {
      const imgRegex = /<img[^>]*>/gi;
      return html.match(imgRegex) || [];
    },
    getHeadings: () => {
      const h1Regex = /<h1[^>]*>.*?<\/h1>/gi;
      return html.match(h1Regex) || [];
    },
    hasTag: (tag: string) => {
      const regex = new RegExp(`<${tag}[^>]*>`, 'i');
      return regex.test(html);
    },
    countMatches: (pattern: RegExp) => {
      const matches = html.match(pattern);
      return matches ? matches.length : 0;
    }
  };
}

function analyzePerformance(response: Response, html: string, fetchTime: number) {
  // Estimate performance metrics based on response
  const htmlSize = new Blob([html]).size;
  const hasMinifiedCSS = html.includes('.min.css') || !html.match(/<style>[\s\n]+/);
  const hasMinifiedJS = html.includes('.min.js');
  const imageCount = (html.match(/<img/gi) || []).length;
  const scriptCount = (html.match(/<script/gi) || []).length;
  const cssCount = (html.match(/<link[^>]+stylesheet/gi) || []).length;

  // Calculate score factors
  let score = 100;

  // Page size penalty
  if (htmlSize > 500000) score -= 20; // > 500KB
  else if (htmlSize > 200000) score -= 10; // > 200KB

  // Loading time penalty
  if (fetchTime > 3000) score -= 20;
  else if (fetchTime > 1500) score -= 10;

  // Optimization penalties
  if (!hasMinifiedCSS) score -= 5;
  if (!hasMinifiedJS) score -= 5;
  if (scriptCount > 10) score -= 10;
  if (cssCount > 5) score -= 5;
  if (imageCount > 30) score -= 10;

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    loadTime: Math.round(fetchTime),
    pageSize: htmlSize,
    speedIndex: Math.round(fetchTime * 1.2),
    largestContentfulPaint: fetchTime / 1000,
    totalBlockingTime: scriptCount * 50,
    cumulativeLayoutShift: imageCount > 20 ? 0.15 : 0.05,
    hasMinifiedAssets: hasMinifiedCSS && hasMinifiedJS,
    resourceCount: scriptCount + cssCount + imageCount
  };
}

function analyzeSEO(doc: any, url: string) {
  const title = doc.getTitle();
  const metaDescription = doc.getMetaDescription();
  const viewport = doc.getMetaTag('viewport');
  const h1Tags = doc.getHeadings();
  const images = doc.getImages();
  const hasRobotsTxt = false; // Would need separate fetch
  const hasSitemap = false; // Would need separate fetch

  let score = 100;

  // Title tag checks
  if (!title) score -= 20;
  else if (title.length < 30 || title.length > 60) score -= 10;

  // Meta description checks
  if (!metaDescription) score -= 15;
  else if (metaDescription.length < 120 || metaDescription.length > 160) score -= 5;

  // H1 tag checks
  if (h1Tags.length === 0) score -= 15;
  else if (h1Tags.length > 1) score -= 5;

  // Mobile-friendly check
  const isMobileFriendly = !!viewport && viewport.includes('width=device-width');
  if (!isMobileFriendly) score -= 20;

  // Image alt tags
  const imagesWithoutAlt = images.filter((img: string) => !img.includes('alt=')).length;
  if (imagesWithoutAlt > 0) score -= Math.min(15, imagesWithoutAlt * 2);

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    hasTitleTag: !!title,
    titleLength: title.length,
    hasMetaDescription: !!metaDescription,
    metaDescriptionLength: metaDescription.length,
    h1Count: h1Tags.length,
    isMobileFriendly,
    hasSitemap,
    hasRobotsTxt,
    imagesWithoutAlt
  };
}

function analyzeAccessibility(doc: any) {
  const images = doc.getImages();
  const missingAltTags = images.filter((img: string) => !img.includes('alt=')).length;
  const hasLang = doc.hasTag('html lang');
  const hasSkipLinks = doc.hasTag('a href="#main"') || doc.hasTag('a href="#content"');
  const formCount = doc.countMatches(/<form/gi);
  const labelCount = doc.countMatches(/<label/gi);

  let score = 100;

  // Alt tags
  if (missingAltTags > 0) score -= Math.min(25, missingAltTags * 3);

  // Language attribute
  if (!hasLang) score -= 15;

  // Skip navigation
  if (!hasSkipLinks) score -= 10;

  // Form labels
  if (formCount > 0 && labelCount < formCount) score -= 10;

  // ARIA landmarks (basic check)
  const hasAriaLandmarks = doc.hasTag('role="main"') || doc.hasTag('role="navigation"');
  if (!hasAriaLandmarks) score -= 10;

  score = Math.max(0, Math.min(100, score));

  const wcagLevel = score >= 90 ? 'AAA' : score >= 70 ? 'AA' : 'A';

  return {
    score,
    missingAltTags,
    hasLangAttribute: hasLang,
    hasSkipNavigation: hasSkipLinks,
    colorContrastIssues: 0, // Would need visual analysis
    wcagLevel,
    formLabelRatio: formCount > 0 ? labelCount / formCount : 1
  };
}

function analyzeSecurity(response: Response, url: string) {
  const hasHTTPS = url.startsWith('https://');
  const hasSSL = hasHTTPS;

  // Check security headers
  const securityHeaders = [
    'strict-transport-security',
    'x-frame-options',
    'x-content-type-options',
    'content-security-policy',
    'x-xss-protection',
    'referrer-policy'
  ];

  let securityHeadersCount = 0;
  securityHeaders.forEach(header => {
    if (response.headers.get(header)) {
      securityHeadersCount++;
    }
  });

  let score = 100;

  // SSL/HTTPS
  if (!hasHTTPS) score -= 40;
  if (!hasSSL) score -= 10;

  // Security headers (each missing header reduces score)
  score -= (securityHeaders.length - securityHeadersCount) * 8;

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    hasHTTPS,
    hasSSL,
    securityHeadersCount,
    headers: {
      hsts: !!response.headers.get('strict-transport-security'),
      xFrameOptions: !!response.headers.get('x-frame-options'),
      xContentTypeOptions: !!response.headers.get('x-content-type-options'),
      csp: !!response.headers.get('content-security-policy'),
      xssProtection: !!response.headers.get('x-xss-protection'),
      referrerPolicy: !!response.headers.get('referrer-policy')
    }
  };
}

function generateRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];

  // Performance recommendations
  if (metrics.performance.score < 70) {
    if (metrics.performance.pageSize > 200000) {
      recommendations.push('Reduce page size by compressing images and minifying CSS/JavaScript');
    }
    if (!metrics.performance.hasMinifiedAssets) {
      recommendations.push('Minify CSS and JavaScript files to improve loading speed');
    }
    if (metrics.performance.resourceCount > 20) {
      recommendations.push('Reduce the number of HTTP requests by combining files');
    }
  }

  // SEO recommendations
  if (metrics.seo.score < 70) {
    if (!metrics.seo.hasTitleTag) {
      recommendations.push('Add a unique title tag to every page');
    }
    if (!metrics.seo.hasMetaDescription) {
      recommendations.push('Add meta descriptions to improve search engine visibility');
    }
    if (metrics.seo.h1Count === 0) {
      recommendations.push('Add at least one H1 heading to each page');
    }
    if (!metrics.seo.isMobileFriendly) {
      recommendations.push('Make your website mobile-friendly with responsive design');
    }
  }

  // Accessibility recommendations
  if (metrics.accessibility.score < 70) {
    if (metrics.accessibility.missingAltTags > 0) {
      recommendations.push(`Add alt text to ${metrics.accessibility.missingAltTags} images for screen readers`);
    }
    if (!metrics.accessibility.hasLangAttribute) {
      recommendations.push('Add a language attribute to the HTML tag');
    }
    if (!metrics.accessibility.hasSkipNavigation) {
      recommendations.push('Add skip navigation links for keyboard users');
    }
  }

  // Security recommendations
  if (metrics.security.score < 70) {
    if (!metrics.security.hasHTTPS) {
      recommendations.push('Enable HTTPS to secure data transmission');
    }
    if (metrics.security.securityHeadersCount < 4) {
      recommendations.push('Add security headers like HSTS, CSP, and X-Frame-Options');
    }
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('Great job! Your website is performing well across all metrics.');
    recommendations.push('Continue monitoring performance and keep content fresh.');
  }

  return recommendations;
}
