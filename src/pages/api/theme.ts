// Theme API - Astro endpoint
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = locals.runtime.env.DB;

    // Get theme settings
    const settings = await db.prepare(
      'SELECT * FROM theme_settings ORDER BY category, setting_key'
    ).all();

    // Get color presets
    const colorPresets = await db.prepare(
      'SELECT * FROM color_presets WHERE is_active = 1 ORDER BY name'
    ).all();

    // Get font presets
    const fontPresets = await db.prepare(
      'SELECT * FROM font_presets WHERE is_active = 1 ORDER BY category, name'
    ).all();

    // Transform settings into a key-value object
    const themeSettings: Record<string, any> = {};
    if (settings.results) {
      settings.results.forEach((setting: any) => {
        themeSettings[setting.setting_key] = setting.setting_value;
      });
    }

    return new Response(JSON.stringify({
      success: true,
      settings: themeSettings,
      colorPresets: colorPresets.results || [],
      fontPresets: fontPresets.results || []
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error: any) {
    console.error('Error fetching theme settings:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      settings: {},
      colorPresets: [],
      fontPresets: []
    }), {
      status: 200, // Return 200 even on error so the page doesn't break
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};

export const POST: APIRoute = async ({ request, locals, cookies }) => {
  try {
    const db = locals.runtime.env.DB;

    // Verify authentication - check both header and cookie
    let token = null;

    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // If no token in header, check cookie
    if (!token) {
      token = cookies.get('authToken')?.value;
    }

    if (!token) {
      console.error('No auth token found');
      return new Response(JSON.stringify({
        success: false,
        error: 'No authentication token provided'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const session = await db.prepare(
      'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")'
    ).bind(token).first();

    if (!session) {
      console.error('Invalid or expired session for token:', token.substring(0, 10) + '...');
      return new Response(JSON.stringify({
        success: false,
        error: 'Session expired or invalid. Please log in again.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json() as any;
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid settings data'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update theme settings
    const updates = [];
    for (const [key, value] of Object.entries(settings)) {
      updates.push(
        db.prepare(
          'INSERT OR REPLACE INTO theme_settings (setting_key, setting_value, updated_at) VALUES (?, ?, datetime("now"))'
        ).bind(key, String(value)).run()
      );
    }

    await Promise.all(updates);

    return new Response(JSON.stringify({
      success: true,
      message: 'Theme settings updated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error updating theme settings:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
