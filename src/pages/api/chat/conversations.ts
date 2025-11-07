import type { APIRoute } from 'astro';

// POST: Start a new conversation
export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  try {
    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();
    const { visitor_name, visitor_email, visitor_phone, initial_message } = data;

    // Validate required fields
    if (!visitor_name || !visitor_email) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Name and email are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get visitor info
    const userAgent = request.headers.get('user-agent') || '';
    const visitorIp = clientAddress || '';

    // Create conversation
    const conversationResult = await db.prepare(`
      INSERT INTO chat_conversations (
        visitor_name, visitor_email, visitor_phone, visitor_ip, visitor_user_agent,
        status, priority, started_at, last_message_at
      ) VALUES (?, ?, ?, ?, ?, 'active', 'normal', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(
      visitor_name,
      visitor_email,
      visitor_phone || null,
      visitorIp,
      userAgent
    ).run();

    const conversationId = conversationResult.meta.last_row_id;

    // Add initial message if provided
    if (initial_message) {
      await db.prepare(`
        INSERT INTO chat_messages (
          conversation_id, message_text, message_type, sender_type, sender_name, sent_at
        ) VALUES (?, ?, 'text', 'visitor', ?, CURRENT_TIMESTAMP)
      `).bind(
        conversationId,
        initial_message,
        visitor_name
      ).run();

      // Update conversation message counts
      await db.prepare(`
        UPDATE chat_conversations
        SET total_messages = 1, visitor_messages = 1
        WHERE id = ?
      `).bind(conversationId).run();

      // Send auto-reply if enabled
      const settingsResult = await db.prepare(`
        SELECT setting_key, setting_value
        FROM chat_settings
        WHERE setting_key IN ('chat_auto_reply_enabled', 'chat_auto_reply')
      `).all();

      const settings: Record<string, string> = {};
      settingsResult.results.forEach((row: any) => {
        settings[row.setting_key] = row.setting_value;
      });

      if (settings.chat_auto_reply_enabled === 'true' && settings.chat_auto_reply) {
        await db.prepare(`
          INSERT INTO chat_messages (
            conversation_id, message_text, message_type, sender_type, sender_name, sent_at
          ) VALUES (?, ?, 'text', 'system', 'System', CURRENT_TIMESTAMP)
        `).bind(
          conversationId,
          settings.chat_auto_reply
        ).run();

        await db.prepare(`
          UPDATE chat_conversations
          SET total_messages = total_messages + 1
          WHERE id = ?
        `).bind(conversationId).run();
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Conversation started successfully',
      conversation_id: conversationId
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error starting conversation:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to start conversation'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// GET: Get all conversations (for admin)
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const status = url.searchParams.get('status') || 'all';
    const assignedTo = url.searchParams.get('assigned_to');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = `
      SELECT
        c.*,
        o.name as operator_name,
        (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id AND is_read = 0 AND sender_type = 'visitor') as unread_count,
        (SELECT message_text FROM chat_messages WHERE conversation_id = c.id ORDER BY sent_at DESC LIMIT 1) as last_message
      FROM chat_conversations c
      LEFT JOIN chat_operators o ON c.assigned_to = o.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status !== 'all') {
      query += ` AND c.status = ?`;
      params.push(status);
    }

    if (assignedTo) {
      query += ` AND c.assigned_to = ?`;
      params.push(parseInt(assignedTo));
    }

    query += ` ORDER BY c.last_message_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await db.prepare(query).bind(...params).all();

    // Get stats
    const statsResult = await db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
      FROM chat_conversations
    `).first();

    return new Response(JSON.stringify({
      success: true,
      conversations: result.results,
      stats: statsResult
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to fetch conversations'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Disable prerendering for this API route
export const prerender = false;
