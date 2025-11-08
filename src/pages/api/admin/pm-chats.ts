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

// GET - Fetch all conversations with stats
export const GET: APIRoute = async ({ request, locals, url }) => {
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

    // Get filters
    const projectId = url.searchParams.get('project_id');
    const clientId = url.searchParams.get('client_id');
    const status = url.searchParams.get('status');

    // Build query
    let query = `
      SELECT
        c.*,
        p.project_name,
        u.company_name as client_name,
        COUNT(m.id) as message_count,
        (
          SELECT AVG(CAST(json_extract(metadata, '$.response_time_ms') AS INTEGER))
          FROM pm_chat_messages
          WHERE conversation_id = c.id AND metadata IS NOT NULL
        ) as avg_response_time,
        (
          SELECT SUM(
            CAST(json_extract(metadata, '$.tokens_input') AS INTEGER) +
            CAST(json_extract(metadata, '$.tokens_output') AS INTEGER)
          )
          FROM pm_chat_messages
          WHERE conversation_id = c.id AND metadata IS NOT NULL
        ) as total_tokens
      FROM pm_chat_conversations c
      JOIN client_projects p ON c.project_id = p.id
      JOIN client_users u ON c.client_id = u.id
      LEFT JOIN pm_chat_messages m ON c.id = m.conversation_id
      WHERE 1=1
    `;

    const params = [];

    if (projectId) {
      query += ' AND c.project_id = ?';
      params.push(projectId);
    }

    if (clientId) {
      query += ' AND c.client_id = ?';
      params.push(clientId);
    }

    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    query += ' GROUP BY c.id ORDER BY c.last_message_at DESC';

    const conversations = await db
      .prepare(query)
      .bind(...params)
      .all();

    // Get overall stats
    const statsQuery = await db
      .prepare(`
        SELECT
          COUNT(DISTINCT c.id) as total_conversations,
          COUNT(m.id) as total_messages,
          AVG(CAST(json_extract(m.metadata, '$.response_time_ms') AS INTEGER)) as avg_response_time,
          SUM(
            CAST(json_extract(m.metadata, '$.tokens_input') AS INTEGER) +
            CAST(json_extract(m.metadata, '$.tokens_output') AS INTEGER)
          ) as total_tokens
        FROM pm_chat_conversations c
        LEFT JOIN pm_chat_messages m ON c.id = m.conversation_id
      `)
      .first();

    // Get all projects for filter
    const projects = await db
      .prepare('SELECT id, project_name FROM client_projects ORDER BY project_name')
      .all();

    // Get all clients for filter
    const clients = await db
      .prepare('SELECT id, company_name FROM client_users ORDER BY company_name')
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        conversations: conversations.results || [],
        stats: {
          totalConversations: statsQuery?.total_conversations || 0,
          totalMessages: statsQuery?.total_messages || 0,
          avgResponseTime: Math.round(statsQuery?.avg_response_time || 0),
          totalTokens: statsQuery?.total_tokens || 0
        },
        projects: projects.results || [],
        clients: clients.results || []
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching PM chats:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch PM chats' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
