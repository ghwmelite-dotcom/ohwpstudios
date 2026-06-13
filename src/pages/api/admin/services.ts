import type { APIRoute } from 'astro';

export const prerender = false;

// Services CRUD API endpoint.
// Auth + CSRF are enforced centrally by src/middleware.ts; no checks here.

interface Service {
  id?: number;
  title: string;
  description: string;
  icon: string;
  display_order?: number;
  is_active?: number;
}

// GET - Fetch all services
export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = (locals as any).runtime?.env?.DB;
    if (!db) {
      return new Response(
        JSON.stringify({
          success: true,
          services: [],
          message: 'Database not available (development mode)',
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

    const result = await db
      .prepare('SELECT * FROM services WHERE is_active = 1 ORDER BY display_order ASC')
      .all();

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
        details: error instanceof Error ? error.message : 'Unknown error',
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
};

// POST - Create or Update service
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = (await request.json()) as Service;
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

    const db = (locals as any).runtime?.env?.DB;
    if (!db) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Service saved (development mode - database not available)',
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
      await db
        .prepare(
          'UPDATE services SET title = ?, description = ?, icon = ?, display_order = ?, updated_at = datetime("now") WHERE id = ?'
        )
        .bind(title, description, icon, display_order, id)
        .run();
    } else {
      // Create new service. Set timestamps explicitly: the production `services`
      // table has created_at/updated_at as NOT NULL without a DEFAULT (schema
      // drift from migration 001), so omitting them 500s.
      await db
        .prepare(
          'INSERT INTO services (title, description, icon, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, datetime("now"), datetime("now"))'
        )
        .bind(title, description, icon, display_order)
        .run();
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
        details: error instanceof Error ? error.message : 'Unknown error',
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
};

// DELETE - Soft delete service
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Service ID is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const db = (locals as any).runtime?.env?.DB;
    if (!db) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Service deleted (development mode - database not available)',
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
    await db
      .prepare('UPDATE services SET is_active = 0, updated_at = datetime("now") WHERE id = ?')
      .bind(id)
      .run();

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
        details: error instanceof Error ? error.message : 'Unknown error',
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
};
