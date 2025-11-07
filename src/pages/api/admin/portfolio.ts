import type { APIRoute } from 'astro';

export const prerender = false;

// GET - List all projects with optional filtering
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(request.url);
    const categoryId = url.searchParams.get('category_id');
    const status = url.searchParams.get('status');

    // Build query
    let query = 'SELECT * FROM portfolio_projects WHERE 1=1';
    const params: any[] = [];

    if (categoryId) {
      query += ' AND category_id = ?';
      params.push(categoryId);
    }

    if (status === 'published') {
      query += ' AND is_published = 1';
    } else if (status === 'draft') {
      query += ' AND is_published = 0';
    } else if (status === 'featured') {
      query += ' AND is_featured = 1';
    }

    query += ' ORDER BY display_order ASC, created_at DESC';

    const projects = await db.prepare(query).bind(...params).all();

    // Get stats
    const stats = await db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN is_published = 1 THEN 1 ELSE 0 END) as published,
        SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END) as featured,
        (SELECT COUNT(DISTINCT id) FROM portfolio_categories) as categories
      FROM portfolio_projects
    `).first();

    return new Response(
      JSON.stringify({
        success: true,
        projects: projects.results,
        stats
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching projects:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch projects' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST - Create new project
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();

    // Generate slug from title
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const result = await db.prepare(`
      INSERT INTO portfolio_projects (
        title, slug, subtitle, description, client_name, project_url,
        featured_image, thumbnail_image, challenge, solution, results,
        category_id, project_date, duration,
        metric_1_label, metric_1_value, metric_2_label, metric_2_value,
        metric_3_label, metric_3_value, metric_4_label, metric_4_value,
        is_featured, is_published, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.title,
      slug,
      data.subtitle || null,
      data.description,
      data.client_name || null,
      data.project_url || null,
      data.featured_image || null,
      data.thumbnail_image || data.featured_image || null,
      data.challenge || null,
      data.solution || null,
      data.results || null,
      data.category_id || null,
      data.project_date || null,
      data.duration || null,
      data.metric_1_label || null,
      data.metric_1_value || null,
      data.metric_2_label || null,
      data.metric_2_value || null,
      data.metric_3_label || null,
      data.metric_3_value || null,
      data.metric_4_label || null,
      data.metric_4_value || null,
      data.is_featured || 0,
      data.is_published !== undefined ? data.is_published : 1,
      data.display_order || 0
    ).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Project created successfully',
        id: result.meta.last_row_id
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating project:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to create project' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT - Update existing project
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project ID required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate slug from title if title is being updated
    if (updateData.title) {
      updateData.slug = updateData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    Object.entries(updateData).forEach(([key, value]) => {
      updates.push(`${key} = ?`);
      params.push(value);
    });

    params.push(id);

    await db.prepare(`
      UPDATE portfolio_projects
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(...params).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Project updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating project:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update project' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
