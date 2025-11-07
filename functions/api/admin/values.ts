// Core Values CRUD API endpoint
interface CoreValue {
  id?: number;
  title: string;
  description: string;
  icon: string;
  display_order?: number;
  is_active?: number;
}

// GET - Fetch all core values
export async function onRequestGet({ env }: { env: any }) {
  try {
    if (!env?.DB) {
      return new Response(
        JSON.stringify({
          success: true,
          values: [],
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
      'SELECT * FROM core_values WHERE is_active = 1 ORDER BY display_order ASC'
    ).all();

    return new Response(
      JSON.stringify({
        success: true,
        values: result.results || [],
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
    console.error('Error fetching core values:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch core values',
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

// POST - Create or Update core value
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

    const body = await request.json() as CoreValue;
    const { id, title, description, icon, display_order = 0 } = body;

    if (!title || !description || !icon) {
      return new Response(
        JSON.stringify({ error: 'Title, description, and icon are required' }),
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
          message: 'Core value saved (development mode - database not available)'
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
      // Update existing core value
      await env.DB.prepare(
        'UPDATE core_values SET title = ?, description = ?, icon = ?, display_order = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(title, description, icon, display_order, id).run();
    } else {
      // Create new core value
      await env.DB.prepare(
        'INSERT INTO core_values (title, description, icon, display_order) VALUES (?, ?, ?, ?)'
      ).bind(title, description, icon, display_order).run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: id ? 'Core value updated successfully' : 'Core value created successfully',
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
    console.error('Error saving core value:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to save core value',
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

// DELETE - Soft delete core value
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
        JSON.stringify({ error: 'Core value ID is required' }),
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
          message: 'Core value deleted (development mode - database not available)'
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

    // Soft delete - set is_active to 0
    await env.DB.prepare(
      'UPDATE core_values SET is_active = 0, updated_at = datetime("now") WHERE id = ?'
    ).bind(id).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Core value deleted successfully',
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
    console.error('Error deleting core value:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to delete core value',
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
