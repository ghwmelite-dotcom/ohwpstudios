import type { APIRoute } from 'astro';

export const prerender = false;

// Helper function to generate unique affiliate code
function generateAffiliateCode(name: string): string {
  const namePrefix = name.toLowerCase().replace(/\s+/g, '').substring(0, 6);
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${namePrefix}${randomSuffix}`.toUpperCase();
}

// Helper function to generate user ID
function generateUserId(): string {
  return `AFF${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const runtime = locals.runtime as any;

    if (!runtime?.env?.DB) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database not available'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const db = runtime.env.DB;
    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.email || !data.why_join || !data.traffic_source) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if email already exists
    const existingAffiliate = await db
      .prepare('SELECT id FROM affiliates WHERE email = ?')
      .bind(data.email)
      .first();

    if (existingAffiliate) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'An affiliate with this email already exists'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate unique affiliate code
    let affiliateCode = generateAffiliateCode(data.name);
    let codeExists = await db
      .prepare('SELECT id FROM affiliates WHERE affiliate_code = ?')
      .bind(affiliateCode)
      .first();

    // Ensure code is unique
    while (codeExists) {
      affiliateCode = generateAffiliateCode(data.name);
      codeExists = await db
        .prepare('SELECT id FROM affiliates WHERE affiliate_code = ?')
        .bind(affiliateCode)
        .first();
    }

    // Generate user ID
    const userId = generateUserId();

    // Process social profiles (convert comma-separated to JSON)
    const socialProfiles = data.social_profiles
      ? JSON.stringify(data.social_profiles.split(',').map((s: string) => s.trim()))
      : null;

    // Add notes field with application info
    const notes = JSON.stringify({
      why_join: data.why_join,
      traffic_source: data.traffic_source,
      applied_at: new Date().toISOString()
    });

    // Insert new affiliate
    const result = await db
      .prepare(`
        INSERT INTO affiliates (
          user_id, email, name, company_name, website,
          social_profiles, affiliate_code, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `)
      .bind(
        userId,
        data.email,
        data.name,
        data.company_name || null,
        data.website || null,
        socialProfiles,
        affiliateCode,
        notes
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Application submitted successfully',
        affiliate_code: affiliateCode
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating affiliate:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to submit application'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
