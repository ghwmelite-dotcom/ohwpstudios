import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';

export const prerender = false;

// Verify client token
async function verifyClientToken(db: any, token: string) {
  const user = await db
    .prepare('SELECT * FROM client_users WHERE token = ? AND token_expires_at > datetime("now") AND status = "active"')
    .bind(token)
    .first();

  return user;
}

// Get or create conversation for a project
async function getOrCreateConversation(db: any, projectId: number, clientId: number) {
  // Check if conversation exists
  let conversation = await db
    .prepare('SELECT * FROM pm_chat_conversations WHERE project_id = ? AND client_id = ? AND status = "active"')
    .bind(projectId, clientId)
    .first();

  if (!conversation) {
    // Create new conversation
    const result = await db
      .prepare('INSERT INTO pm_chat_conversations (project_id, client_id, status) VALUES (?, ?, "active")')
      .bind(projectId, clientId)
      .run();

    conversation = {
      id: result.meta.last_row_id,
      project_id: projectId,
      client_id: clientId,
      status: 'active'
    };
  }

  return conversation;
}

// Fetch project context for AI
async function getProjectContext(db: any, projectId: number) {
  // Get project details
  const project = await db
    .prepare('SELECT * FROM client_projects WHERE id = ?')
    .bind(projectId)
    .first();

  if (!project) {
    throw new Error('Project not found');
  }

  // Get milestones
  const milestones = await db
    .prepare('SELECT * FROM project_milestones WHERE project_id = ? ORDER BY display_order ASC')
    .bind(projectId)
    .all();

  // Get recent updates (last 10)
  const updates = await db
    .prepare('SELECT * FROM project_updates WHERE project_id = ? ORDER BY created_at DESC LIMIT 10')
    .bind(projectId)
    .all();

  // Get recent files (last 10)
  const files = await db
    .prepare('SELECT * FROM project_files WHERE project_id = ? ORDER BY uploaded_at DESC LIMIT 10')
    .bind(projectId)
    .all();

  // Get contracts
  const contracts = await db
    .prepare('SELECT * FROM contracts WHERE project_id = ?')
    .bind(projectId)
    .all();

  return {
    project,
    milestones: milestones.results || [],
    updates: updates.results || [],
    files: files.results || [],
    contracts: contracts.results || []
  };
}

// Build system prompt with project context
function buildSystemPrompt(context: any): string {
  const { project, milestones, updates, files, contracts } = context;

  let prompt = `You are a professional Project Manager AI assistant for "${project.project_name}". You help the client stay informed about their project and answer questions in a friendly, professional manner.

**Current Project Status:**
- Project Name: ${project.project_name}
- Type: ${project.project_type}
- Status: ${project.status}
- Progress: ${project.progress_percentage}%
- Budget: ${project.budget || 'Not specified'}
- Start Date: ${project.start_date || 'Not specified'}
- Estimated Completion: ${project.estimated_completion || 'Not specified'}
- Description: ${project.description || 'No description provided'}

`;

  // Add milestones
  if (milestones.length > 0) {
    prompt += `**Project Milestones:**\n`;
    milestones.forEach((m: any, idx: number) => {
      prompt += `${idx + 1}. ${m.title} - Status: ${m.status}`;
      if (m.due_date) prompt += ` | Due: ${m.due_date}`;
      if (m.description) prompt += ` | ${m.description}`;
      prompt += '\n';
    });
    prompt += '\n';
  }

  // Add recent updates
  if (updates.length > 0) {
    prompt += `**Recent Project Updates:**\n`;
    updates.forEach((u: any, idx: number) => {
      if (idx < 5) { // Show only last 5 updates in prompt
        prompt += `- [${new Date(u.created_at).toLocaleDateString()}] ${u.title}: ${u.description}\n`;
      }
    });
    prompt += '\n';
  }

  // Add files info
  if (files.length > 0) {
    prompt += `**Recent Files (${files.length} files):**\n`;
    files.forEach((f: any, idx: number) => {
      if (idx < 5) { // Show only last 5 files
        prompt += `- ${f.file_name} (${f.category}) - Uploaded: ${new Date(f.uploaded_at).toLocaleDateString()}\n`;
      }
    });
    prompt += '\n';
  }

  // Add contracts info
  if (contracts.length > 0) {
    prompt += `**Contracts:**\n`;
    contracts.forEach((c: any) => {
      prompt += `- ${c.title} - Status: ${c.status}`;
      if (c.amount) prompt += ` | Amount: ${c.amount}`;
      if (c.signed_by_client) prompt += ` | Signed by client`;
      prompt += '\n';
    });
    prompt += '\n';
  }

  prompt += `**Your Role as Project Manager:**
- Answer questions about project status, timeline, and deliverables
- Provide updates on milestones and progress
- Explain technical aspects in simple, easy-to-understand terms
- Be proactive in suggesting next steps or actions
- Help the client understand what's happening with their project
- Always be professional, helpful, and reassuring
- If you don't have specific information, acknowledge it and suggest contacting the team directly

**Guidelines:**
- Keep responses concise but informative (2-4 paragraphs maximum)
- Use bullet points for clarity when listing multiple items
- Provide specific dates, numbers, and percentages when available
- Always maintain a positive, solution-oriented tone
- Be honest about project status, including any delays or issues
- Use emojis sparingly and professionally (1-2 per message at most)
- Address the client by acknowledging their question directly
- If asked about scheduling meetings or making changes, guide them on how to contact the team

Remember: You're here to inform and assist, creating confidence in the project's progress.`;

  return prompt;
}

// GET endpoint - Fetch conversation history
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
    const user = await verifyClientToken(db, token);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify project belongs to client
    const project = await db
      .prepare('SELECT * FROM client_projects WHERE id = ? AND client_id = ?')
      .bind(projectId, user.id)
      .first();

    if (!project) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get or create conversation
    const conversation = await getOrCreateConversation(db, parseInt(projectId), user.id);

    // Fetch messages (last 50)
    const messages = await db
      .prepare('SELECT * FROM pm_chat_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 50')
      .bind(conversation.id)
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        conversationId: conversation.id,
        messages: messages.results || []
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch chat history' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST endpoint - Send message and get AI response
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    const anthropicApiKey = locals.runtime?.env?.ANTHROPIC_API_KEY;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, error: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
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
    const user = await verifyClientToken(db, token);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { projectId, message } = body;

    if (!projectId || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project ID and message are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check (max 10 messages per minute)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const conversation = await getOrCreateConversation(db, projectId, user.id);

    const recentMessages = await db
      .prepare('SELECT COUNT(*) as count FROM pm_chat_messages WHERE conversation_id = ? AND created_at > ? AND role = "user"')
      .bind(conversation.id, oneMinuteAgo)
      .first();

    if (recentMessages && recentMessages.count >= 10) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Please wait a moment before sending more messages.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify project belongs to client
    const project = await db
      .prepare('SELECT * FROM client_projects WHERE id = ? AND client_id = ?')
      .bind(projectId, user.id)
      .first();

    if (!project) {
      return new Response(
        JSON.stringify({ success: false, error: 'Project not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get project context
    const context = await getProjectContext(db, projectId);
    const systemPrompt = buildSystemPrompt(context);

    // Save user message
    const userMessageResult = await db
      .prepare('INSERT INTO pm_chat_messages (conversation_id, role, content) VALUES (?, ?, ?)')
      .bind(conversation.id, 'user', message)
      .run();

    // Get conversation history (last 10 messages for context)
    const historyMessages = await db
      .prepare('SELECT role, content FROM pm_chat_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 10')
      .bind(conversation.id)
      .all();

    // Build conversation history for Claude (in reverse order)
    const conversationHistory = (historyMessages.results || [])
      .reverse()
      .filter((m: any) => m.role !== 'system')
      .map((m: any) => ({
        role: m.role,
        content: m.content
      }));

    // Call Claude API
    const anthropic = new Anthropic({
      apiKey: anthropicApiKey,
    });

    const startTime = Date.now();

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: conversationHistory.length > 0 ? conversationHistory : [
        { role: 'user', content: message }
      ]
    });

    const responseTime = Date.now() - startTime;
    const aiMessage = response.content[0].type === 'text' ? response.content[0].text : '';

    // Save AI response with metadata
    const metadata = JSON.stringify({
      model: response.model,
      tokens_input: response.usage.input_tokens,
      tokens_output: response.usage.output_tokens,
      response_time_ms: responseTime,
      stop_reason: response.stop_reason
    });

    await db
      .prepare('INSERT INTO pm_chat_messages (conversation_id, role, content, metadata) VALUES (?, ?, ?, ?)')
      .bind(conversation.id, 'assistant', aiMessage, metadata)
      .run();

    // Update conversation last_message_at
    await db
      .prepare('UPDATE pm_chat_conversations SET last_message_at = datetime("now"), updated_at = datetime("now") WHERE id = ?')
      .bind(conversation.id)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        message: aiMessage,
        conversationId: conversation.id,
        metadata: {
          response_time_ms: responseTime,
          tokens_used: response.usage.input_tokens + response.usage.output_tokens
        }
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    console.error('Error processing chat message:', error);

    // Handle specific Anthropic API errors
    let errorMessage = 'Failed to process message';
    if (error.status === 401) {
      errorMessage = 'AI service authentication failed';
    } else if (error.status === 429) {
      errorMessage = 'AI service rate limit reached. Please try again in a moment.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
