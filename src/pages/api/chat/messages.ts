import type { APIRoute } from 'astro';

// GET: Get messages for a conversation
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const conversationId = url.searchParams.get('conversation_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const since = url.searchParams.get('since'); // Get messages after this ID

    if (!conversationId) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Conversation ID is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let query = `
      SELECT
        m.*,
        o.name as operator_name,
        o.avatar_url as operator_avatar
      FROM chat_messages m
      LEFT JOIN chat_operators o ON m.sender_id = o.id AND m.sender_type = 'operator'
      WHERE m.conversation_id = ?
    `;

    const params: any[] = [parseInt(conversationId)];

    if (since) {
      query += ` AND m.id > ?`;
      params.push(parseInt(since));
    }

    query += ` ORDER BY m.sent_at ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await db.prepare(query).bind(...params).all();

    // Mark messages as read (if this is a visitor fetching messages)
    if (!since) {
      await db.prepare(`
        UPDATE chat_messages
        SET is_read = 1, read_at = CURRENT_TIMESTAMP
        WHERE conversation_id = ? AND sender_type = 'operator' AND is_read = 0
      `).bind(conversationId).run();
    }

    return new Response(JSON.stringify({
      success: true,
      messages: result.results
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to fetch messages'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST: Send a message
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();
    const { conversation_id, message, sender_type, sender_id, sender_name } = data;

    // Validate required fields
    if (!conversation_id || !message || !sender_type) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Conversation ID, message, and sender type are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify conversation exists
    const conversation = await db.prepare(`
      SELECT id, status FROM chat_conversations WHERE id = ?
    `).bind(conversation_id).first();

    if (!conversation) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Conversation not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert message
    const messageResult = await db.prepare(`
      INSERT INTO chat_messages (
        conversation_id, message_text, message_type, sender_type,
        sender_id, sender_name, sent_at
      ) VALUES (?, ?, 'text', ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(
      conversation_id,
      message,
      sender_type,
      sender_id || null,
      sender_name || null
    ).run();

    const messageId = messageResult.meta.last_row_id;

    // Update conversation
    const updateFields = ['total_messages = total_messages + 1'];
    if (sender_type === 'visitor') {
      updateFields.push('visitor_messages = visitor_messages + 1');
    } else if (sender_type === 'operator') {
      updateFields.push('operator_messages = operator_messages + 1');

      // Set first response time if this is the first operator message
      const operatorMsgCount = await db.prepare(`
        SELECT COUNT(*) as count FROM chat_messages
        WHERE conversation_id = ? AND sender_type = 'operator'
      `).bind(conversation_id).first();

      if ((operatorMsgCount as any)?.count === 1) {
        // Calculate first response time
        const conversationData = await db.prepare(`
          SELECT started_at FROM chat_conversations WHERE id = ?
        `).bind(conversation_id).first() as any;

        if (conversationData) {
          const startTime = new Date(conversationData.started_at).getTime();
          const responseTime = Math.floor((Date.now() - startTime) / 1000); // seconds
          updateFields.push(`first_response_time = ${responseTime}`);
        }
      }
    }

    await db.prepare(`
      UPDATE chat_conversations
      SET ${updateFields.join(', ')}, last_message_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(conversation_id).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Message sent successfully',
      message_id: messageId
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error sending message:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to send message'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT: Mark messages as read
export const PUT: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();
    const { conversation_id, message_id } = data;

    if (message_id) {
      // Mark specific message as read
      await db.prepare(`
        UPDATE chat_messages
        SET is_read = 1, read_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(message_id).run();
    } else if (conversation_id) {
      // Mark all messages in conversation as read
      await db.prepare(`
        UPDATE chat_messages
        SET is_read = 1, read_at = CURRENT_TIMESTAMP
        WHERE conversation_id = ? AND is_read = 0
      `).bind(conversation_id).run();
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Either message_id or conversation_id is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Messages marked as read'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to mark messages as read'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Disable prerendering for this API route
export const prerender = false;
