import type { APIRoute } from 'astro';

// GET: Get all canned responses
export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await db.prepare(`
      SELECT * FROM chat_canned_responses
      WHERE is_active = 1
      ORDER BY usage_count DESC, title ASC
    `).all();

    return new Response(JSON.stringify({
      success: true,
      responses: result.results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error fetching canned responses:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to fetch canned responses'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST: Create a new canned response
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();
    const { title, shortcut, message, category } = data;

    if (!title || !message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Title and message are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await db.prepare(`
      INSERT INTO chat_canned_responses (title, shortcut, message, category)
      VALUES (?, ?, ?, ?)
    `).bind(
      title,
      shortcut || null,
      message,
      category || 'general'
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Canned response created successfully',
      id: result.meta.last_row_id
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error creating canned response:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to create canned response'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Disable prerendering for this API route
export const prerender = false;
