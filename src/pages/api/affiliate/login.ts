import type { APIRoute } from 'astro';

export const prerender = false;

// Helper function to generate a simple token
function generateToken(affiliateId: number, email: string): string {
  const payload = `${affiliateId}:${email}:${Date.now()}`;
  return Buffer.from(payload).toString('base64');
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
    if (!data.email || !data.affiliate_code) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email and affiliate code are required'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Find affiliate by email and code
    const affiliate = await db
      .prepare(`
        SELECT
          id, user_id, email, name, affiliate_code, status
        FROM affiliates
        WHERE email = ? AND affiliate_code = ?
      `)
      .bind(data.email, data.affiliate_code)
      .first();

    if (!affiliate) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid credentials'
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if affiliate is active
    if (affiliate.status !== 'active') {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Your affiliate account is ${affiliate.status}. Please contact support.`
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Generate authentication token
    const token = generateToken(affiliate.id as number, affiliate.email as string);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        affiliate: {
          id: affiliate.id,
          user_id: affiliate.user_id,
          name: affiliate.name,
          email: affiliate.email,
          affiliate_code: affiliate.affiliate_code,
          status: affiliate.status
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error logging in affiliate:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Login failed'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
