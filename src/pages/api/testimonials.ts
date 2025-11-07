// Testimonials API - Astro endpoint
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = locals.runtime.env.DB;

    const result = await db.prepare(
      'SELECT * FROM testimonials WHERE is_active = 1 ORDER BY display_order ASC'
    ).all();

    return new Response(JSON.stringify({
      success: true,
      testimonials: result.results || []
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error: any) {
    console.error('Error fetching testimonials:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      testimonials: []
    }), {
      status: 200, // Return 200 so fallback data can be used
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
