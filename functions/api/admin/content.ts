// Content management API endpoint with D1 database persistence
interface Env {
  DB: D1Database;
}

interface ContentData {
  [key: string]: string;
}

// GET - Fetch content from D1 database
export async function onRequestGet({ env }: { env: Env }) {
  try {
    // Fetch all content from database
    const { results } = await env.DB.prepare(
      'SELECT content_key, content_value FROM site_content'
    ).all();

    // Transform results into key-value object
    const content: ContentData = {};
    if (results) {
      for (const row of results as Array<{ content_key: string; content_value: string }>) {
        content[row.content_key] = row.content_value;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        content,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Content fetch error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch content',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}

// POST - Update content in D1 database
export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const body = await request.json() as { content: ContentData };
    const { content } = body;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content data is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Verify auth token (simplified for development)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // Update each content item in database
    const updates = Object.entries(content).map(([key, value]) => {
      return env.DB.prepare(
        `INSERT INTO site_content (content_key, content_value, content_type, updated_at)
         VALUES (?, ?, 'text', datetime('now'))
         ON CONFLICT(content_key) DO UPDATE SET
           content_value = excluded.content_value,
           updated_at = excluded.updated_at`
      ).bind(key, value);
    });

    // Execute all updates in a batch
    await env.DB.batch(updates);

    console.log('Content updated in database:', Object.keys(content));

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Content updated successfully',
        updated_keys: Object.keys(content),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Content update error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to update content',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}

// Handle OPTIONS request for CORS
export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
