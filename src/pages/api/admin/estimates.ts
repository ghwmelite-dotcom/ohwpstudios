import type { APIRoute } from 'astro';

export const prerender = false;

// Auth is enforced centrally by src/middleware.ts (session cookie + CSRF on
// mutations). This handler ports the logic that previously lived, unreachable,
// in functions/api/admin/estimates.ts.

const json = (body: object, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const VALID_STATUS = ['new', 'reviewed', 'contacted', 'converted'];

export const GET: APIRoute = async ({ locals }) => {
  const db = locals.runtime?.env?.DB;
  if (!db) return json({ success: false, message: 'Service unavailable' }, 503);
  try {
    const result = await db
      .prepare('SELECT * FROM project_estimates ORDER BY created_at DESC')
      .all();
    return json({ success: true, estimates: result.results });
  } catch (error) {
    console.error('Error fetching estimates:', error);
    return json({ success: false, message: 'Failed to fetch estimates' }, 500);
  }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime?.env?.DB;
  if (!db) return json({ success: false, message: 'Service unavailable' }, 503);
  try {
    const data = await request.json();
    if (!data.id) return json({ success: false, message: 'Estimate ID is required' }, 400);

    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.status !== undefined) {
      if (!VALID_STATUS.includes(data.status)) {
        return json({ success: false, message: 'Invalid status value' }, 400);
      }
      updates.push('status = ?');
      values.push(data.status);
    }
    if (data.admin_notes !== undefined) {
      updates.push('admin_notes = ?');
      values.push(data.admin_notes);
    }
    if (updates.length === 0) return json({ success: false, message: 'No fields to update' }, 400);

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(data.id);

    const result = await db
      .prepare(`UPDATE project_estimates SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
    if (result.meta.changes === 0) return json({ success: false, message: 'Estimate not found' }, 404);
    return json({ success: true, message: 'Estimate updated successfully' });
  } catch (error) {
    console.error('Error updating estimate:', error);
    return json({ success: false, message: 'Failed to update estimate' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const db = locals.runtime?.env?.DB;
  if (!db) return json({ success: false, message: 'Service unavailable' }, 503);
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return json({ success: false, message: 'Estimate ID is required' }, 400);
    const result = await db.prepare('DELETE FROM project_estimates WHERE id = ?').bind(id).run();
    if (result.meta.changes === 0) return json({ success: false, message: 'Estimate not found' }, 404);
    return json({ success: true, message: 'Estimate deleted successfully' });
  } catch (error) {
    console.error('Error deleting estimate:', error);
    return json({ success: false, message: 'Failed to delete estimate' }, 500);
  }
};
