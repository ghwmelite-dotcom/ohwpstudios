// Blog Posts API endpoint
interface BlogPost {
  id?: number;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featured_image?: string;
  author?: string;
  published?: number;
  published_at?: string;
  seo_title?: string;
  seo_description?: string;
  tags?: string;
}

// GET - Fetch all blog posts
export async function onRequestGet({ env, request }: { env: any; request: Request }) {
  try {
    const url = new URL(request.url);
    const includeUnpublished = url.searchParams.get('all') === 'true';

    if (!env?.DB) {
      // Return sample data in development
      return new Response(
        JSON.stringify({
          success: true,
          posts: [
            {
              id: 1,
              title: 'Sample Blog Post',
              slug: 'sample-blog-post',
              excerpt: 'This is a sample blog post',
              content: '<p>Sample content</p>',
              published: 1,
              published_at: new Date().toISOString()
            }
          ],
          message: 'Database not available (development mode)'
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

    let query = 'SELECT * FROM blog_posts';
    if (!includeUnpublished) {
      query += ' WHERE published = 1';
    }
    query += ' ORDER BY published_at DESC, created_at DESC';

    const result = await env.DB.prepare(query).all();

    return new Response(
      JSON.stringify({
        success: true,
        posts: result.results || [],
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
    console.error('Error fetching blog posts:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch blog posts',
        details: error instanceof Error ? error.message : 'Unknown error'
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
}

// POST - Create new blog post
export async function onRequestPost({ request, env }: { request: Request; env: any }) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const post = await request.json() as BlogPost;

    if (!env?.DB) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Blog post saved (development mode - database not available)'
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

    // Generate slug from title if not provided
    if (!post.slug && post.title) {
      post.slug = post.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }

    // Set published_at if publishing
    if (post.published && !post.published_at) {
      post.published_at = new Date().toISOString();
    }

    const result = await env.DB.prepare(
      `INSERT INTO blog_posts (
        title, slug, excerpt, content, featured_image, author,
        published, published_at, seo_title, seo_description, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      post.title,
      post.slug,
      post.excerpt || null,
      post.content,
      post.featured_image || null,
      post.author || 'OHWP Studios',
      post.published || 0,
      post.published_at || null,
      post.seo_title || null,
      post.seo_description || null,
      post.tags || null
    ).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Blog post created successfully',
        id: result.meta.last_row_id,
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
    console.error('Error creating blog post:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to create blog post',
        details: error instanceof Error ? error.message : 'Unknown error'
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
}

// PUT - Update blog post
export async function onRequestPut({ request, env }: { request: Request; env: any }) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const post = await request.json() as BlogPost;

    if (!post.id) {
      return new Response(
        JSON.stringify({ error: 'Post ID is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (!env?.DB) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Blog post updated (development mode - database not available)'
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

    // Set published_at if publishing for the first time
    if (post.published && !post.published_at) {
      post.published_at = new Date().toISOString();
    }

    await env.DB.prepare(
      `UPDATE blog_posts SET
        title = ?, slug = ?, excerpt = ?, content = ?,
        featured_image = ?, author = ?, published = ?, published_at = ?,
        seo_title = ?, seo_description = ?, tags = ?,
        updated_at = datetime('now')
      WHERE id = ?`
    ).bind(
      post.title,
      post.slug,
      post.excerpt || null,
      post.content,
      post.featured_image || null,
      post.author || 'OHWP Studios',
      post.published || 0,
      post.published_at || null,
      post.seo_title || null,
      post.seo_description || null,
      post.tags || null,
      post.id
    ).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Blog post updated successfully',
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
    console.error('Error updating blog post:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to update blog post',
        details: error instanceof Error ? error.message : 'Unknown error'
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
}

// DELETE - Delete blog post
export async function onRequestDelete({ request, env }: { request: Request; env: any }) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Post ID is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    if (!env?.DB) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Blog post deleted (development mode - database not available)'
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

    await env.DB.prepare('DELETE FROM blog_posts WHERE id = ?').bind(id).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Blog post deleted successfully',
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
    console.error('Error deleting blog post:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to delete blog post',
        details: error instanceof Error ? error.message : 'Unknown error'
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
