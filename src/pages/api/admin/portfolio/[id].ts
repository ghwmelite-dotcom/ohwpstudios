import type { APIRoute } from 'astro';

export const prerender = false;

// GET - Fetch single project
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const project = await db.prepare('SELECT * FROM portfolio_projects WHERE id = ?')
      .bind(id)
      .first();

    if (!project) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get project images
    const images = await db.prepare('SELECT * FROM portfolio_project_images WHERE project_id = ? ORDER BY display_order ASC')
      .bind(id)
      .all();

    // Get project tags
    const tags = await db.prepare(`
      SELECT t.* FROM portfolio_tags t
      INNER JOIN portfolio_project_tags pt ON t.id = pt.tag_id
      WHERE pt.project_id = ?
    `).bind(id).all();

    // Get testimonials
    const testimonials = await db.prepare('SELECT * FROM portfolio_testimonials WHERE project_id = ? ORDER BY created_at DESC')
      .bind(id)
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        project,
        images: images.results,
        tags: tags.results,
        testimonials: testimonials.results
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching project:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch project' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE - Delete project
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { id } = params;

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete project (cascade will handle related records)
    await db.prepare('DELETE FROM portfolio_projects WHERE id = ?')
      .bind(id)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Project deleted successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error deleting project:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to delete project' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
  }
};
