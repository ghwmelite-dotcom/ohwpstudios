// Portfolio CRUD API endpoint
interface PortfolioItem {
  id?: number;
  title: string;
  description: string;
  image_url?: string;
  project_url?: string;
  tags?: string;
  featured?: number;
}

// GET - Fetch all portfolio items
export async function onRequestGet({ env }: { env: any }) {
  try {
    if (!env?.DB) {
      return new Response(
        JSON.stringify({
          success: true,
          portfolio: [],
          message: 'Database not available (development mode)'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const result = await env.DB.prepare(
      'SELECT * FROM portfolio ORDER BY created_at DESC'
    ).all();

    return new Response(
      JSON.stringify({
        success: true,
        portfolio: result.results || [],
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
    console.error('Error fetching portfolio:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch portfolio',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// POST - Create or Update portfolio item
export async function onRequestPost({ request, env }: { request: Request; env: any }) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const body = await request.json() as PortfolioItem;
    const { id, title, description, image_url = '', project_url = '', tags = '', featured = 0 } = body;

    if (!title || !description) {
      return new Response(
        JSON.stringify({ error: 'Title and description are required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (!env?.DB) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Portfolio item saved (development mode - database not available)'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (id) {
      // Update existing item
      await env.DB.prepare(
        'UPDATE portfolio SET title = ?, description = ?, image_url = ?, project_url = ?, tags = ?, featured = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(title, description, image_url, project_url, tags, featured, id).run();
    } else {
      // Create new item
      await env.DB.prepare(
        'INSERT INTO portfolio (title, description, image_url, project_url, tags, featured) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(title, description, image_url, project_url, tags, featured).run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: id ? 'Portfolio item updated successfully' : 'Portfolio item created successfully',
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
    console.error('Error saving portfolio item:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to save portfolio item',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// DELETE - Delete portfolio item
export async function onRequestDelete({ request, env }: { request: Request; env: any }) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Portfolio item ID is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (!env?.DB) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Portfolio item deleted (development mode - database not available)'
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    await env.DB.prepare(
      'DELETE FROM portfolio WHERE id = ?'
    ).bind(id).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Portfolio item deleted successfully',
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
    console.error('Error deleting portfolio item:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to delete portfolio item',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
