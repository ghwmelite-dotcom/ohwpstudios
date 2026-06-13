import type { APIRoute } from 'astro';

export const prerender = false;

// Team Members CRUD API endpoint.
// Auth + CSRF are enforced centrally by src/middleware.ts; no checks here.

interface TeamMember {
  id?: number;
  name: string;
  role: string;
  bio?: string;
  image_url?: string;
  display_order?: number;
  is_active?: number;
}

// GET - Fetch all team members
export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = (locals as any).runtime?.env?.DB;
    if (!db) {
      return new Response(
        JSON.stringify({
          success: true,
          team: [],
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
      .prepare('SELECT * FROM team_members WHERE is_active = 1 ORDER BY display_order ASC')
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        team: result.results || [],
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
    console.error('Error fetching team members:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch team members',
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

// POST - Create or Update team member
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = (await request.json()) as TeamMember;
    const { id, name, role, bio = '', image_url = '', display_order = 0 } = body;

    if (!name || !role) {
      return new Response(JSON.stringify({ error: 'Name and role are required' }), {
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
          message: 'Team member saved (development mode - database not available)',
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
      // Update existing team member
      await db
        .prepare(
          'UPDATE team_members SET name = ?, role = ?, bio = ?, image_url = ?, display_order = ?, updated_at = datetime("now") WHERE id = ?'
        )
        .bind(name, role, bio, image_url, display_order, id)
        .run();
    } else {
      // Create new team member
      await db
        .prepare(
          'INSERT INTO team_members (name, role, bio, image_url, display_order) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(name, role, bio, image_url, display_order)
        .run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: id ? 'Team member updated successfully' : 'Team member created successfully',
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
    console.error('Error saving team member:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to save team member',
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

// DELETE - Soft delete team member
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Team member ID is required' }), {
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
          message: 'Team member deleted (development mode - database not available)',
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
      .prepare('UPDATE team_members SET is_active = 0, updated_at = datetime("now") WHERE id = ?')
      .bind(id)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Team member deleted successfully',
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
    console.error('Error deleting team member:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to delete team member',
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
