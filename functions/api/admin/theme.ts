// Theme Customization API
// Handles color schemes, fonts, and theme settings

interface Env {
  DB: D1Database;
}

// Helper to verify authentication
async function verifyAuth(request: Request, env: Env): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;

  const token = authHeader.substring(7);
  const session = await env.DB.prepare(
    'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")'
  ).bind(token).first();

  return !!session;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    // Get theme settings
    const settings = await env.DB.prepare(
      'SELECT * FROM theme_settings ORDER BY category, setting_key'
    ).all();

    // Get color presets
    const colorPresets = await env.DB.prepare(
      'SELECT * FROM color_presets WHERE is_active = 1 ORDER BY name'
    ).all();

    // Get font presets
    const fontPresets = await env.DB.prepare(
      'SELECT * FROM font_presets WHERE is_active = 1 ORDER BY category, name'
    ).all();

    // Transform settings into a key-value object
    const themeSettings: Record<string, any> = {};
    settings.results.forEach((setting: any) => {
      themeSettings[setting.setting_key] = setting.setting_value;
    });

    return new Response(JSON.stringify({
      success: true,
      settings: themeSettings,
      colorPresets: colorPresets.results,
      fontPresets: fontPresets.results
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    console.error('Error fetching theme settings:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    // Verify authentication
    const isAuthenticated = await verifyAuth(request, env);
    if (!isAuthenticated) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized'
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
        env.DB.prepare(
          'INSERT OR REPLACE INTO theme_settings (setting_key, setting_value, updated_at) VALUES (?, ?, datetime("now"))'
        ).bind(key, String(value)).run()
      );
    }

    await Promise.all(updates);

    return new Response(JSON.stringify({
      success: true,
      message: 'Theme settings updated successfully'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    console.error('Error updating theme settings:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

// Handle OPTIONS for CORS
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
};
