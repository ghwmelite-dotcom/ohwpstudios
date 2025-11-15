import type { APIRoute } from 'astro';
import { getCORSHeaders, handleCORSPreflight } from '@/utils/cors';

export const prerender = false;

interface ContentData {
  [key: string]: string;
}

// Default content for fallback
const defaultContent: ContentData = {
  hero_title: 'Crafting Digital Excellence That Drives Results',
  hero_subtitle: 'We design and build stunning, high-performance websites and digital experiences for forward-thinking businesses ready to dominate their industry.',
  hero_stat1_number: '500+',
  hero_stat1_label: 'Projects Delivered',
  hero_stat2_number: '98%',
  hero_stat2_label: 'Client Satisfaction',
  hero_stat3_number: '50+',
  hero_stat3_label: 'Team Members',
  site_name: 'Your Agency Name',
  site_tagline: 'Crafting Digital Excellence',
  site_email: 'hello@yoursite.com',
  site_phone: '+1 (555) 123-4567',
};

// GET - Fetch content
export const GET: APIRoute = async ({ locals }) => {
  try {
    const runtime = locals.runtime as any;
    
    // Try to get from database
    if (runtime?.env?.DB) {
      try {
        const result = await runtime.env.DB.prepare(
          'SELECT content_key, content_value FROM site_content'
        ).all();

        if (result.results && result.results.length > 0) {
          const content: ContentData = {};
          result.results.forEach((row: any) => {
            content[row.content_key] = row.content_value;
          });
          
          console.log('✅ Content loaded from D1 database');
          
          return new Response(
            JSON.stringify({
              success: true,
              content: content,
              source: 'database'
            }),
            {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );
        }
      } catch (dbError) {
        console.warn('⚠️ Database read error, using defaults:', dbError);
      }
    }

    // Fallback to default content
    console.log('📦 Using default content (database not available)');
    
    return new Response(
      JSON.stringify({
        success: true,
        content: defaultContent,
        source: 'default'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('❌ Content fetch error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch content',
        content: defaultContent 
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
        } 
      }
    );
  }
};

// POST - Update content
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json() as { content: ContentData };
    const { content } = body;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content data is required' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
          } 
        }
      );
    }

    // Verify auth token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { 
            'Content-Type': 'application/json',
          } 
        }
      );
    }

    const runtime = locals.runtime as any;
    
    // Try to save to database
    if (runtime?.env?.DB) {
      try {
        // Update each content field in database
        for (const [key, value] of Object.entries(content)) {
          await runtime.env.DB.prepare(
            `INSERT INTO site_content (content_key, content_value, content_type, updated_at) 
             VALUES (?, ?, 'text', datetime('now'))
             ON CONFLICT(content_key) DO UPDATE SET 
               content_value = excluded.content_value,
               updated_at = excluded.updated_at`
          ).bind(key, value).run();
        }

        console.log('✅ Content saved to D1 database');
        console.log('📝 Updated fields:', Object.keys(content));

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Content saved to database successfully',
            content: content,
            persisted: true
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (dbError) {
        console.error('❌ Database write error:', dbError);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to save to database',
            details: dbError instanceof Error ? dbError.message : String(dbError)
          }),
          { 
            status: 500, 
            headers: { 
              'Content-Type': 'application/json',
            } 
          }
        );
      }
    }

    // If no database, return error in production
    console.warn('⚠️ Database not available - changes will not persist!');
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Database not configured - changes will not be saved',
        message: 'Please configure D1 database for persistent storage'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('❌ Content update error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update content',
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
        } 
      }
    );
  }
};

// OPTIONS for CORS
export const OPTIONS: APIRoute = async (context) => {
  const preflightResponse = handleCORSPreflight(context.request);
  if (preflightResponse) {
    return preflightResponse;
  }
  return new Response(null, { status: 405 });
};
