// Consolidated API endpoint for initial page load data
// Combines theme settings, site content, and blog count into single request
// Reduces 4 separate API calls to 1

import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const db = locals.runtime?.env?.DB;

  if (!db) {
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

  try {
    // Fetch all data in parallel for maximum performance
    const [themeSettings, siteContent, blogCount] = await Promise.all([
      // Theme settings
      db.prepare('SELECT * FROM theme_settings WHERE id = 1').first().catch(() => null),

      // Site content (logo, favicon, etc.)
      db.prepare(`
        SELECT
          site_name,
          site_logo,
          site_favicon,
          site_description
        FROM site_content
        WHERE id = 1
      `).first().catch(() => null),

      // Blog post count
      db.prepare(`
        SELECT COUNT(*) as count
        FROM blog_posts
        WHERE status = 'published'
      `).first().catch(() => ({ count: 0 }))
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          theme: themeSettings || null,
          content: siteContent || null,
          blogCount: blogCount?.count || 0
        }
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60' // Cache for 1 minute
        }
      }
    );
  } catch (error) {
    console.error('Error fetching page init data:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch page data',
        data: {
          theme: null,
          content: null,
          blogCount: 0
        }
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
