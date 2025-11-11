import type { APIRoute } from 'astro';

export const prerender = false;

// GET - Fetch all blog posts
export const GET: APIRoute = async ({ locals }) => {
  try {
    const runtime = locals.runtime as any;

    if (!runtime?.env?.DB) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database not available'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const db = runtime.env.DB;

    // Fetch all published blog posts, ordered by published date
    const posts = await db
      .prepare(`
        SELECT
          id,
          title,
          slug,
          excerpt,
          content,
          featured_image,
          author,
          published,
          published_at,
          created_at,
          updated_at,
          seo_title,
          seo_description,
          tags
        FROM blog_posts
        WHERE published = 1
        ORDER BY published_at DESC
      `)
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        posts: posts.results || []
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch blog posts'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// POST - Create new blog post
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const runtime = locals.runtime as any;
    const db = runtime.env.DB;
    const data = await request.json();

    // Validate required fields
    if (!data.title || !data.slug || !data.content) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: title, slug, content'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Insert new blog post
    const result = await db
      .prepare(`
        INSERT INTO blog_posts (
          title, slug, excerpt, content, featured_image,
          author, published, published_at, seo_title, seo_description, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        data.title,
        data.slug,
        data.excerpt || null,
        data.content,
        data.featured_image || null,
        data.author || 'OHWP Studios',
        data.published ? 1 : 0,
        data.published_at || null,
        data.seo_title || null,
        data.seo_description || null,
        data.tags || null
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        id: result.meta.last_row_id
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating blog post:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to create blog post'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// PUT - Update blog post
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    const runtime = locals.runtime as any;
    const db = runtime.env.DB;
    const data = await request.json();

    if (!data.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing blog post ID'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Update blog post
    await db
      .prepare(`
        UPDATE blog_posts
        SET
          title = ?,
          slug = ?,
          excerpt = ?,
          content = ?,
          featured_image = ?,
          author = ?,
          published = ?,
          published_at = ?,
          seo_title = ?,
          seo_description = ?,
          tags = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `)
      .bind(
        data.title,
        data.slug,
        data.excerpt || null,
        data.content,
        data.featured_image || null,
        data.author || 'OHWP Studios',
        data.published ? 1 : 0,
        data.published_at || null,
        data.seo_title || null,
        data.seo_description || null,
        data.tags || null,
        data.id
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating blog post:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to update blog post'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// DELETE - Delete blog post
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const runtime = locals.runtime as any;
    const db = runtime.env.DB;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing blog post ID'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    await db
      .prepare('DELETE FROM blog_posts WHERE id = ?')
      .bind(id)
      .run();

    return new Response(
      JSON.stringify({
        success: true
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to delete blog post'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
