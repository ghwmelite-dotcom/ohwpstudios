import type { APIRoute } from 'astro';

export const prerender = false;

// About Page Content API endpoint.
// Auth + CSRF are enforced centrally by src/middleware.ts; no checks here.

interface AboutContent {
  hero_badge?: string;
  hero_title?: string;
  hero_description?: string;
  story_title?: string;
  story_content?: string;
}

// GET - Fetch about page content
export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = (locals as any).runtime?.env?.DB;
    if (!db) {
      return new Response(
        JSON.stringify({
          success: true,
          content: {
            hero_badge: 'About Us',
            hero_title: 'Building Digital Excellence One Project at a Time',
            hero_description:
              "We're a team of passionate designers, developers, and strategists dedicated to creating digital experiences that make a difference.",
            story_title: 'Our Story',
            story_content:
              'Founded with a vision to transform the digital landscape, our agency has grown from a small team of passionate creators into a full-service digital powerhouse. We believe in the power of great design and cutting-edge technology to solve real business challenges.',
          },
          message: 'Database not available (development mode)',
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

    const result = await db
      .prepare(
        "SELECT content_key, content_value FROM site_content WHERE content_key LIKE 'about_%'"
      )
      .all();

    const content: AboutContent = {};
    if (result.results) {
      result.results.forEach((row: any) => {
        const key = row.content_key.replace('about_', '');
        content[key as keyof AboutContent] = row.content_value;
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        content,
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
    console.error('Error fetching about content:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to fetch about content',
        details: error instanceof Error ? error.message : 'Unknown error',
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
};

// POST - Update about page content
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = (await request.json()) as AboutContent;

    const db = (locals as any).runtime?.env?.DB;
    if (!db) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'About content saved (development mode - database not available)',
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

    // Update each content field
    const updates = [];
    if (body.hero_badge !== undefined) {
      updates.push(
        db
          .prepare(
            "INSERT OR REPLACE INTO site_content (content_key, content_value, content_type, updated_at, updated_by) VALUES ('about_hero_badge', ?, 'text', datetime('now'), 1)"
          )
          .bind(body.hero_badge)
          .run()
      );
    }
    if (body.hero_title !== undefined) {
      updates.push(
        db
          .prepare(
            "INSERT OR REPLACE INTO site_content (content_key, content_value, content_type, updated_at, updated_by) VALUES ('about_hero_title', ?, 'text', datetime('now'), 1)"
          )
          .bind(body.hero_title)
          .run()
      );
    }
    if (body.hero_description !== undefined) {
      updates.push(
        db
          .prepare(
            "INSERT OR REPLACE INTO site_content (content_key, content_value, content_type, updated_at, updated_by) VALUES ('about_hero_description', ?, 'text', datetime('now'), 1)"
          )
          .bind(body.hero_description)
          .run()
      );
    }
    if (body.story_title !== undefined) {
      updates.push(
        db
          .prepare(
            "INSERT OR REPLACE INTO site_content (content_key, content_value, content_type, updated_at, updated_by) VALUES ('about_story_title', ?, 'text', datetime('now'), 1)"
          )
          .bind(body.story_title)
          .run()
      );
    }
    if (body.story_content !== undefined) {
      updates.push(
        db
          .prepare(
            "INSERT OR REPLACE INTO site_content (content_key, content_value, content_type, updated_at, updated_by) VALUES ('about_story_content', ?, 'text', datetime('now'), 1)"
          )
          .bind(body.story_content)
          .run()
      );
    }

    await Promise.all(updates);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'About content updated successfully',
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
    console.error('Error updating about content:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to update about content',
        details: error instanceof Error ? error.message : 'Unknown error',
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
};
