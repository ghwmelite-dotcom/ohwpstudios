import type { APIRoute } from 'astro';

export const prerender = false;

// Verify admin token
async function verifyAdminToken(db: any, token: string) {
  const user = await db
    .prepare('SELECT * FROM users WHERE token = ? AND token_expires_at > datetime("now")')
    .bind(token)
    .first();

  return user;
}

// GET - Fetch conversation details with messages
export const GET: APIRoute = async ({ request, locals, params }) => {
  try {
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyAdminToken(db, token);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const conversationId = params.id;

    if (!conversationId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Conversation ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get conversation details
    const conversation = await db
      .prepare(`
        SELECT
          c.*,
          p.project_name,
          u.company_name as client_name,
          u.email as client_email
        FROM pm_chat_conversations c
        JOIN client_projects p ON c.project_id = p.id
        JOIN client_users u ON c.client_id = u.id
        WHERE c.id = ?
      `)
      .bind(conversationId)
      .first();

    if (!conversation) {
      return new Response(
        JSON.stringify({ success: false, error: 'Conversation not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get all messages for this conversation
    const messages = await db
      .prepare('SELECT * FROM pm_chat_messages WHERE conversation_id = ? ORDER BY created_at ASC')
      .bind(conversationId)
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        conversation,
        messages: messages.results || []
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching conversation details:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch conversation details' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT - Update conversation status (archive/activate)
export const PUT: APIRoute = async ({ request, locals, params }) => {
  try {
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.substring(7);
    const user = await verifyAdminToken(db, token);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const conversationId = params.id;
    const body = await request.json();
    const { status } = body;

    if (!conversationId || !status) {
      return new Response(
        JSON.stringify({ success: false, error: 'Conversation ID and status are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!['active', 'archived'].includes(status)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid status. Must be "active" or "archived"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update conversation status
    await db
      .prepare('UPDATE pm_chat_conversations SET status = ?, updated_at = datetime("now") WHERE id = ?')
      .bind(status, conversationId)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: `Conversation ${status === 'archived' ? 'archived' : 'activated'} successfully`
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating conversation:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update conversation' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
