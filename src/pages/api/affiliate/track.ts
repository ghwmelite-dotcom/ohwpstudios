import type { APIRoute } from 'astro';

export const prerender = false;

// Helper function to generate tracking cookie
function generateTrackingCookie(): string {
  return `AFFTR_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

export const GET: APIRoute = async ({ request, locals, redirect }) => {
  try {
    const runtime = locals.runtime as any;

    if (!runtime?.env?.DB) {
      // If DB not available, redirect to homepage without tracking
      return redirect('/', 302);
    }

    const db = runtime.env.DB;
    const url = new URL(request.url);
    const affiliateCode = url.searchParams.get('ref');

    if (!affiliateCode) {
      // No affiliate code, redirect to homepage
      return redirect('/', 302);
    }

    // Find affiliate by code
    const affiliate = await db
      .prepare('SELECT id, status FROM affiliates WHERE affiliate_code = ?')
      .bind(affiliateCode.toUpperCase())
      .first();

    if (!affiliate || affiliate.status !== 'active') {
      // Invalid or inactive affiliate, redirect without tracking
      return redirect('/', 302);
    }

    // Get client info
    const ipAddress = request.headers.get('cf-connecting-ip') ||
                      request.headers.get('x-forwarded-for') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent') || '';
    const referer = request.headers.get('referer') || '';

    // Get UTM parameters
    const utmSource = url.searchParams.get('utm_source') || null;
    const utmMedium = url.searchParams.get('utm_medium') || null;
    const utmCampaign = url.searchParams.get('utm_campaign') || null;

    // Get landing page (where to redirect)
    const landingPage = url.searchParams.get('landing') || '/';

    // Generate unique tracking cookie
    const trackingCookie = generateTrackingCookie();

    // Cookie expires in 90 days
    const cookieExpires = new Date();
    cookieExpires.setDate(cookieExpires.getDate() + 90);

    // Insert click record
    await db
      .prepare(`
        INSERT INTO affiliate_clicks (
          affiliate_id, affiliate_code, ip_address, user_agent,
          referer, landing_page, utm_source, utm_medium, utm_campaign,
          tracking_cookie, cookie_expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        affiliate.id,
        affiliateCode.toUpperCase(),
        ipAddress.substring(0, 45), // Ensure it fits in the field
        userAgent.substring(0, 255),
        referer.substring(0, 255),
        landingPage,
        utmSource,
        utmMedium,
        utmCampaign,
        trackingCookie,
        cookieExpires.toISOString()
      )
      .run();

    // Update affiliate click count
    await db
      .prepare(`
        UPDATE affiliates
        SET total_clicks = total_clicks + 1
        WHERE id = ?
      `)
      .bind(affiliate.id)
      .run();

    // Set cookie and redirect
    const headers = new Headers();
    headers.set('Location', landingPage);

    // Set cookie with affiliate reference
    const cookieMaxAge = 90 * 24 * 60 * 60; // 90 days in seconds
    headers.set(
      'Set-Cookie',
      `affiliate_ref=${affiliateCode.toUpperCase()}; Max-Age=${cookieMaxAge}; Path=/; SameSite=Lax; Secure`
    );

    // Also set tracking cookie
    headers.append(
      'Set-Cookie',
      `affiliate_tracking=${trackingCookie}; Max-Age=${cookieMaxAge}; Path=/; SameSite=Lax; Secure`
    );

    return new Response(null, {
      status: 302,
      headers
    });
  } catch (error) {
    console.error('Error tracking affiliate click:', error);
    // On error, still redirect to homepage
    return redirect('/', 302);
  }
};
