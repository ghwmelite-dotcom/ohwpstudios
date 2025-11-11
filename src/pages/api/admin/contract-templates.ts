import type { APIRoute } from 'astro';

export const prerender = false;

// GET: Fetch all contract templates or a specific template by ID
export const GET: APIRoute = async ({ request, locals, url }) => {
  try {
    // Check authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify admin token
    const session = await db
      .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(token)
      .first();

    if (!session) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const templateId = url.searchParams.get('id');
    const category = url.searchParams.get('category');
    const activeOnly = url.searchParams.get('active') === 'true';

    if (templateId) {
      // Fetch specific template
      const template = await db
        .prepare('SELECT * FROM contract_templates WHERE id = ?')
        .bind(templateId)
        .first();

      if (!template) {
        return new Response(JSON.stringify({ error: 'Template not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(template), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Fetch all templates with optional filters
      let query = 'SELECT * FROM contract_templates WHERE 1=1';
      let params: any[] = [];

      if (category) {
        query += ' AND category = ?';
        params.push(category);
      }

      if (activeOnly) {
        query += ' AND active = 1';
      }

      query += ' ORDER BY name ASC';

      const stmt = params.length > 0 ? db.prepare(query).bind(...params) : db.prepare(query);
      const result = await stmt.all();

      return new Response(JSON.stringify(result.results || []), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error fetching contract templates:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST: Create new contract template
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify admin token
    const session = await db
      .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(token)
      .first();

    if (!session) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.template_content) {
      return new Response(JSON.stringify({ error: 'Name and template content are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert template
    const result = await db
      .prepare(`
        INSERT INTO contract_templates (
          name,
          description,
          template_content,
          category,
          placeholders,
          default_terms,
          active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `)
      .bind(
        data.name,
        data.description || null,
        data.template_content,
        data.category || null,
        data.placeholders || null,
        data.default_terms || null,
        data.active !== undefined ? data.active : 1
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        template_id: result.meta.last_row_id
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating contract template:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT: Update existing contract template
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify admin token
    const session = await db
      .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(token)
      .first();

    if (!session) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();
    const { id, ...updates } = data;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Template ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'name', 'description', 'template_content', 'category',
      'placeholders', 'default_terms', 'active'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(updates[field]);
      }
    }

    if (updateFields.length === 0) {
      return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    updateFields.push('updated_at = datetime("now")');
    updateValues.push(id);

    await db
      .prepare(`UPDATE contract_templates SET ${updateFields.join(', ')} WHERE id = ?`)
      .bind(...updateValues)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating contract template:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE: Delete contract template
export const DELETE: APIRoute = async ({ request, locals, url }) => {
  try {
    // Check authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify admin token
    const session = await db
      .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(token)
      .first();

    if (!session) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Template ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if template is being used
    const contractsUsing = await db
      .prepare('SELECT COUNT(*) as count FROM contracts WHERE template_id = ?')
      .bind(id)
      .first();

    if (contractsUsing && (contractsUsing.count as number) > 0) {
      return new Response(
        JSON.stringify({
          error: `Cannot delete template: ${contractsUsing.count} contract(s) are using it`
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    await db.prepare('DELETE FROM contract_templates WHERE id = ?').bind(id).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting contract template:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
