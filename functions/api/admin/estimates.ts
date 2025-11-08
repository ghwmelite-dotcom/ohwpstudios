interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    // Get all estimates with sorting
    const result = await context.env.DB.prepare(`
      SELECT * FROM project_estimates
      ORDER BY created_at DESC
    `).all();

    return new Response(JSON.stringify({
      success: true,
      estimates: result.results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching estimates:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to fetch estimates',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const data = await context.request.json();

    if (!data.id) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Estimate ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];

    if (data.status) {
      // Validate status
      if (!['new', 'reviewed', 'contacted', 'converted'].includes(data.status)) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Invalid status value'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      updates.push('status = ?');
      values.push(data.status);
    }

    if (data.admin_notes !== undefined) {
      updates.push('admin_notes = ?');
      values.push(data.admin_notes);
    }

    if (updates.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'No fields to update'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Add updated_at timestamp
    updates.push('updated_at = CURRENT_TIMESTAMP');

    // Add ID to values
    values.push(data.id);

    const query = `
      UPDATE project_estimates
      SET ${updates.join(', ')}
      WHERE id = ?
    `;

    const result = await context.env.DB.prepare(query).bind(...values).run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Estimate not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Estimate updated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating estimate:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to update estimate',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Estimate ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await context.env.DB.prepare(`
      DELETE FROM project_estimates WHERE id = ?
    `).bind(id).run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Estimate not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Estimate deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error deleting estimate:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Failed to delete estimate',
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
