# Virtual PM (Project Manager) AI Chatbot - Setup Guide

## Overview

The Virtual PM AI Chatbot is an intelligent assistant that helps clients get 24/7 answers about their projects. It uses Anthropic's Claude AI (Sonnet 3.5) to provide context-aware responses based on project details, milestones, updates, and files.

## Features

### Client-Facing Features:
- **Floating Chat Button**: Eye-catching button in bottom-right corner with notification badge
- **Modern Chat Interface**: Beautiful dark-themed chat window with smooth animations
- **Quick Action Buttons**: Pre-populated questions for common queries
- **Intelligent AI Responses**: Context-aware answers using Claude AI
- **Conversation History**: Persistent chat history across sessions
- **Real-time Typing Indicators**: Shows when AI is processing response
- **Mobile Responsive**: Full-screen chat on mobile devices

### Admin Features:
- **Chat Monitoring Dashboard**: View all client conversations
- **Detailed Analytics**: Track message counts, response times, and token usage
- **Filter & Search**: Filter by project, client, or conversation status
- **Conversation Viewer**: Read full chat histories
- **Performance Metrics**: Monitor AI response quality

## Installation Steps

### 1. Install Dependencies

```bash
npm install @anthropic-ai/sdk
```

### 2. Configure Anthropic API Key

Add your Anthropic API key to `wrangler.toml`:

```toml
[vars]
ANTHROPIC_API_KEY = "your-actual-anthropic-api-key-here"
```

**Important**: Replace `"your-anthropic-api-key-here"` with your actual Anthropic API key from https://console.anthropic.com/

### 3. Run Database Migration

Apply the database migration to create the required tables:

```bash
# Using wrangler
wrangler d1 execute agency-db --local --file=./migrations/009_virtual_pm_chat.sql

# Or for production
wrangler d1 execute agency-db --remote --file=./migrations/009_virtual_pm_chat.sql
```

This creates two tables:
- `pm_chat_conversations`: Stores conversation metadata
- `pm_chat_messages`: Stores individual messages

### 4. Verify Installation

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to a client project page: `/client/project/[id]`

3. You should see the floating chat button in the bottom-right corner

4. Click to open and test the chat

## Files Created

### Database
- `migrations/009_virtual_pm_chat.sql` - Database schema for chat system

### API Endpoints
- `src/pages/api/client/pm-chat.ts` - Client chat API (GET & POST)
- `src/pages/api/admin/pm-chats.ts` - Admin monitoring API
- `src/pages/api/admin/pm-chats/[id].ts` - Individual conversation API

### UI Components
- `src/components/PMChatWidget.astro` - Chat widget component

### Admin Pages
- `src/pages/admin/pm-chats.astro` - Admin monitoring dashboard

## How It Works

### Client Side

1. **Client opens project page** → Chat widget loads with welcome message
2. **Client clicks chat button** → Widget expands, loads conversation history
3. **Client sends message** → API validates auth, fetches project context
4. **AI processes message** → Claude AI generates response using project data
5. **Response displayed** → Message saved to database, shown in chat

### AI Context

The AI has access to:
- Project name, type, status, and progress
- Budget and timeline information
- Milestone details and status
- Recent project updates (last 10)
- Recently uploaded files (last 10)
- Contract information
- Complete description

### System Prompt

The AI is instructed to:
- Act as a professional Project Manager
- Answer questions about status, timeline, and deliverables
- Explain technical concepts in simple terms
- Be proactive in suggesting next steps
- Maintain a positive, solution-oriented tone
- Be honest when information is unavailable

## Configuration

### Rate Limiting

Default: 10 messages per minute per client
Location: `src/pages/api/client/pm-chat.ts` (line ~272)

```typescript
if (recentMessages && recentMessages.count >= 10) {
  // Rate limit exceeded
}
```

### Message History

Default: Last 10 messages used for context
Location: `src/pages/api/client/pm-chat.ts` (line ~295)

```typescript
const historyMessages = await db
  .prepare('SELECT role, content FROM pm_chat_messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 10')
```

### AI Model

Default: `claude-3-5-sonnet-20241022`
Location: `src/pages/api/client/pm-chat.ts` (line ~310)

```typescript
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  max_tokens: 1024,
  // ...
});
```

## Usage Examples

### Quick Actions

Pre-configured buttons appear at the top of the chat:
- "What's the current project status?"
- "When is the next milestone due?"
- "How many tasks are completed?"
- "What files have been uploaded recently?"
- "Can you summarize the recent updates?"

### Sample Questions

Clients can ask:
- "What's my project timeline?"
- "When will the design phase be completed?"
- "How much of my budget has been used?"
- "What was the last update on my project?"
- "Can you explain the current milestone?"
- "What deliverables are coming up next?"

## Admin Monitoring

### Access Dashboard

Navigate to: `/admin/pm-chats`

### View Statistics

- **Total Conversations**: Number of active chat conversations
- **Total Messages**: All messages across all conversations
- **Avg Response Time**: Average AI response time in milliseconds
- **Total Tokens**: Total Claude API tokens consumed

### Filter Conversations

- By Project
- By Client
- By Status (Active/Archived)

### View Conversation Details

Click any conversation card to see:
- Full message history
- User and AI messages
- Token usage per message
- Response times
- Timestamps

## API Reference

### Client Endpoints

#### GET `/api/client/pm-chat`
Fetch conversation history for a project

**Query Parameters:**
- `projectId` (required): Project ID

**Headers:**
- `Authorization: Bearer {clientToken}`

**Response:**
```json
{
  "success": true,
  "conversationId": 1,
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "What's the project status?",
      "created_at": "2024-01-01T12:00:00Z"
    }
  ]
}
```

#### POST `/api/client/pm-chat`
Send a message and get AI response

**Headers:**
- `Authorization: Bearer {clientToken}`
- `Content-Type: application/json`

**Body:**
```json
{
  "projectId": 1,
  "message": "What's the current status?"
}
```

**Response:**
```json
{
  "success": true,
  "message": "AI response here...",
  "conversationId": 1,
  "metadata": {
    "response_time_ms": 1234,
    "tokens_used": 567
  }
}
```

### Admin Endpoints

#### GET `/api/admin/pm-chats`
Get all conversations with stats

**Query Parameters:**
- `project_id` (optional): Filter by project
- `client_id` (optional): Filter by client
- `status` (optional): Filter by status (active/archived)

**Headers:**
- `Authorization: Bearer {adminToken}`

#### GET `/api/admin/pm-chats/[id]`
Get conversation details

**Headers:**
- `Authorization: Bearer {adminToken}`

## Troubleshooting

### Chat button not appearing
- Verify widget is imported in project page
- Check browser console for errors
- Ensure client is authenticated

### AI not responding
- Verify ANTHROPIC_API_KEY is set correctly
- Check API key is valid at https://console.anthropic.com/
- Check network tab for API errors
- Review server logs for error messages

### Database errors
- Ensure migration has been applied
- Verify D1 database is configured in wrangler.toml
- Check database permissions

### Rate limiting issues
- Increase rate limit in API endpoint
- Implement custom rate limiting logic
- Use Redis for distributed rate limiting

## Security Considerations

### Authentication
- All endpoints require valid tokens
- Client tokens verified against database
- Admin endpoints have separate authentication

### Data Privacy
- Conversations are private to each client
- Admin access is logged (implement if needed)
- Messages stored securely in D1 database

### API Key Security
- Never commit API keys to version control
- Use environment variables
- Rotate keys regularly
- Monitor API usage

## Performance Tips

### Optimize Response Times
- Cache project context when possible
- Reduce conversation history limit
- Use faster Claude model if needed

### Reduce Token Usage
- Limit context size in system prompt
- Reduce max_tokens in API call
- Summarize long conversations

### Scale Considerations
- Implement connection pooling for database
- Add CDN for static assets
- Use Cloudflare Workers KV for caching
- Monitor API rate limits

## Cost Estimation

### Anthropic API Costs
- Sonnet 3.5: ~$3 per million input tokens
- Output tokens: ~$15 per million tokens
- Average conversation: ~500-1000 tokens
- Estimated cost: $0.01-0.02 per conversation

### Tips to Reduce Costs
- Use shorter system prompts
- Implement caching for common questions
- Archive old conversations
- Monitor high-usage clients

## Future Enhancements

Potential improvements:
- [ ] Streaming responses for better UX
- [ ] Voice input/output support
- [ ] Multi-language support
- [ ] Custom AI personalities per project
- [ ] Integration with task management
- [ ] Email notifications for messages
- [ ] Analytics dashboard for insights
- [ ] A/B testing different prompts
- [ ] Auto-archive old conversations
- [ ] Export conversation transcripts

## Support

For issues or questions:
1. Check this documentation
2. Review error logs in browser console
3. Check Cloudflare Workers logs
4. Review Anthropic API status
5. Contact development team

## Version History

- **v1.0.0** (2024-01-01): Initial release
  - Basic chat functionality
  - Admin monitoring
  - Claude Sonnet 3.5 integration
  - Rate limiting
  - Mobile responsive design
