// Services CRUD API endpoint
interface Service {
  id?: number;
  title: string;
  description: string;
  icon: string;
  display_order?: number;
  is_active?: number;
}

// GET - Fetch all services
export async function onRequestGet({ env }: { env: any }) {
  try {
    if (!env?.DB) {
      return new Response(
        JSON.stringify({
          success: true,
          services: [],
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
      'SELECT * FROM services WHERE is_active = 1 ORDER BY display_order ASC'
    ).all();

    return new Response(
      JSON.stringify({
        success: true,
        services: result.results || [],
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
    console.error('Error fetching services:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch services',
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

// POST - Create or Update service
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

    const body = await request.json() as Service;
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
          message: 'Service saved (development mode - database not available)'
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
      // Update existing service
      await env.DB.prepare(
        'UPDATE services SET title = ?, description = ?, icon = ?, display_order = ?, updated_at = datetime("now") WHERE id = ?'
      ).bind(title, description, icon, display_order, id).run();
    } else {
      // Create new service
      await env.DB.prepare(
        'INSERT INTO services (title, description, icon, display_order) VALUES (?, ?, ?, ?)'
      ).bind(title, description, icon, display_order).run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: id ? 'Service updated successfully' : 'Service created successfully',
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
    console.error('Error saving service:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to save service',
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

// DELETE - Delete service
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
        JSON.stringify({ error: 'Service ID is required' }),
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
          message: 'Service deleted (development mode - database not available)'
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
      'UPDATE services SET is_active = 0, updated_at = datetime("now") WHERE id = ?'
    ).bind(id).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Service deleted successfully',
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
    console.error('Error deleting service:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to delete service',
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
