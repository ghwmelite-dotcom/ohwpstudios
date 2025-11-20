import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response('Database not available', { status: 500 });
    }

    // Fetch all published blog posts
    const result = await db
      .prepare('SELECT slug, updated_at, published_at FROM blog_posts WHERE published = 1 ORDER BY published_at DESC')
      .all();

    const posts = result.results || [];
    const siteUrl = 'https://ohwpstudios.org';

    // Generate XML sitemap
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${posts.map((post: any) => {
    const lastmod = post.updated_at || post.published_at || new Date().toISOString();
    return `
  <url>
    <loc>${siteUrl}/blog/${post.slug}</loc>
    <lastmod>${lastmod.split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }).join('')}
</urlset>`;

    return new Response(sitemap, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error generating blog sitemap:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
};
