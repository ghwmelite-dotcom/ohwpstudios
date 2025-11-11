// Blog Posts API endpoint
interface Env {
  DB: D1Database;
}

// GET - Fetch all blog posts
export async function onRequestGet({ env }: { env: Env }) {
  try {
    const db = env.DB;

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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}

// POST - Create new blog post
export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const db = env.DB;
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
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}

// PUT - Update blog post
export async function onRequestPut({ request, env }: { request: Request; env: Env }) {
  try {
    const db = env.DB;
    const data = await request.json();

    if (!data.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing blog post ID'
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}

// DELETE - Delete blog post
export async function onRequestDelete({ request, env }: { request: Request; env: Env }) {
  try {
    const db = env.DB;
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
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
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
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
