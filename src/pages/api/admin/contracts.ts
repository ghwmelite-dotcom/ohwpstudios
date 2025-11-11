import type { APIRoute } from 'astro';

export const prerender = false;

// GET: Fetch all contracts or a specific contract by ID
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
    const runtime = locals.runtime as any;

    if (!runtime?.env?.DB) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = runtime.env.DB;

    // Verify admin token
    const adminSession = await db
      .prepare('SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(token)
      .first();

    if (!adminSession) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const contractId = url.searchParams.get('id');
    const status = url.searchParams.get('status');

    if (contractId) {
      // Fetch specific contract
      const contract = await db
        .prepare('SELECT * FROM contracts WHERE id = ?')
        .bind(contractId)
        .first();

      if (!contract) {
        return new Response(JSON.stringify({ error: 'Contract not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(contract), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Fetch all contracts with optional status filter
      let query = 'SELECT * FROM contracts';
      let params: any[] = [];

      if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }

      query += ' ORDER BY created_at DESC';

      const stmt = params.length > 0 ? db.prepare(query).bind(...params) : db.prepare(query);
      const result = await stmt.all();

      return new Response(JSON.stringify(result.results || []), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Error fetching contracts:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST: Create new contract
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
    const runtime = locals.runtime as any;

    if (!runtime?.env?.DB) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = runtime.env.DB;

    // Verify admin token
    const adminSession = await db
      .prepare('SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(token)
      .first();

    if (!adminSession) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();

    // Generate unique contract number
    const year = new Date().getFullYear();
    const countResult = await db
      .prepare('SELECT COUNT(*) as count FROM contracts WHERE contract_number LIKE ?')
      .bind(`CON-${year}-%`)
      .first();

    const count = (countResult?.count as number || 0) + 1;
    const contractNumber = `CON-${year}-${String(count).padStart(3, '0')}`;

    // Insert contract
    const result = await db
      .prepare(`
        INSERT INTO contracts (
          contract_number,
          template_id,
          client_name,
          client_email,
          client_company,
          client_phone,
          client_address,
          title,
          description,
          content,
          total_amount,
          currency,
          payment_terms,
          start_date,
          end_date,
          delivery_date,
          status,
          notes,
          created_by,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `)
      .bind(
        contractNumber,
        data.template_id || null,
        data.client_name,
        data.client_email,
        data.client_company || null,
        data.client_phone || null,
        data.client_address || null,
        data.title,
        data.description || null,
        data.content,
        data.total_amount || null,
        data.currency || 'USD',
        data.payment_terms || null,
        data.start_date || null,
        data.end_date || null,
        data.delivery_date || null,
        data.status || 'draft',
        data.notes || null,
        adminSession.username
      )
      .run();

    // Create history entry
    await db
      .prepare(`
        INSERT INTO contract_history (contract_id, action, performed_by, changes, created_at)
        VALUES (?, 'created', ?, ?, datetime('now'))
      `)
      .bind(
        result.meta.last_row_id,
        adminSession.username,
        JSON.stringify({ contract_number: contractNumber })
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        contract_id: result.meta.last_row_id,
        contract_number: contractNumber
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating contract:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT: Update existing contract
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
    const runtime = locals.runtime as any;

    if (!runtime?.env?.DB) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = runtime.env.DB;

    // Verify admin token
    const adminSession = await db
      .prepare('SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(token)
      .first();

    if (!adminSession) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();
    const { id, ...updates } = data;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Contract ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'client_name', 'client_email', 'client_company', 'client_phone', 'client_address',
      'title', 'description', 'content', 'total_amount', 'currency', 'payment_terms',
      'start_date', 'end_date', 'delivery_date', 'status', 'notes'
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
      .prepare(`UPDATE contracts SET ${updateFields.join(', ')} WHERE id = ?`)
      .bind(...updateValues)
      .run();

    // Create history entry
    await db
      .prepare(`
        INSERT INTO contract_history (contract_id, action, performed_by, changes, created_at)
        VALUES (?, 'edited', ?, ?, datetime('now'))
      `)
      .bind(
        id,
        adminSession.username,
        JSON.stringify(updates)
      )
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating contract:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE: Delete contract
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
    const runtime = locals.runtime as any;

    if (!runtime?.env?.DB) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = runtime.env.DB;

    // Verify admin token
    const adminSession = await db
      .prepare('SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(token)
      .first();

    if (!adminSession) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Contract ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await db.prepare('DELETE FROM contracts WHERE id = ?').bind(id).run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting contract:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
