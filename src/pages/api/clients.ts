import type { APIRoute } from 'astro';

export const prerender = false;

// GET - Fetch active clients for public display
export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch only active clients, ordered by display_order and featured status
    const clients = await db
      .prepare(`
        SELECT
          id, name, logo_url, website_url, industry, description,
          project_type, project_value, is_featured, display_order
        FROM clients
        WHERE status = 'active'
        ORDER BY is_featured DESC, display_order ASC, created_at DESC
      `)
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        clients: clients.results || []
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
        }
      }
    );
  } catch (error) {
    console.error('Error fetching clients:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch clients' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
