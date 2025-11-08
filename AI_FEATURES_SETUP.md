# AI Features Setup Guide

This guide covers the setup and configuration of the three new AI-powered features:
1. AI Project Estimator
2. Live Code Quality Dashboard
3. Virtual PM AI Chatbot

## Prerequisites

- Anthropic API Key (Claude API access)
- Cloudflare Pages deployment
- Access to Cloudflare D1 database

## Step 1: Configure Anthropic API Key

### For Local Development

1. Create or update `.dev.vars` file in the project root:
```bash
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

2. Restart your dev server:
```bash
npm run dev
```

### For Production (Cloudflare Pages)

1. Go to your Cloudflare Pages dashboard
2. Navigate to your project settings
3. Go to **Environment Variables** section
4. Add a new variable:
   - **Name**: `ANTHROPIC_API_KEY`
   - **Value**: `sk-ant-your-api-key-here`
   - **Environment**: Production (and Preview if needed)
5. Redeploy your application

## Step 2: Database Migrations

All database migrations have been applied. Verify tables exist:

```sql
-- Check if tables exist
SELECT name FROM sqlite_master WHERE type='table' AND name IN (
  'project_estimates',
  'code_quality_metrics',
  'deployment_history',
  'pm_chat_conversations',
  'pm_chat_messages'
);
```

## Step 3: Test the Features

### 1. AI Project Estimator

**Public URL**: `/estimate-project`

**Test Steps**:
1. Navigate to the estimator page
2. Fill out the form:
   - Name, email, company (optional)
   - Describe your project in detail
   - Select project type (web, mobile, both, other)
   - Choose timeline and budget preferences
3. Click "Get AI Analysis"
4. Verify you receive:
   - Cost estimate range
   - Timeline in weeks
   - Technology stack recommendations
   - Team size estimate
   - Risk assessment

**Admin Access**: `/admin/estimates`
- View all submitted estimates
- Filter by status (new, reviewed, contacted, converted)
- Add notes and update status
- View detailed AI analysis

### 2. Live Code Quality Dashboard

**Client Access**: Available in client portal at `/client/project/[id]`
- Click "Code Quality" tab to view metrics

**Admin Management**: `/admin/code-quality`

**Test Steps**:
1. Log in to admin panel
2. Navigate to Code Quality management
3. Add sample metrics for a project:
   - Code coverage: 85%
   - Security score: 92%
   - Performance score: 88%
   - Test pass rate: 95%
   - Add deployment history
4. Log in as a client
5. View project dashboard
6. Check Code Quality tab displays metrics correctly

**Sample Data Script** (via Wrangler CLI):
```bash
# Add sample metrics
wrangler d1 execute agency-db --command "
INSERT INTO code_quality_metrics (
  project_id, metric_date, code_coverage_percent,
  security_score, performance_score, test_pass_rate,
  total_tests, passing_tests, failing_tests,
  code_quality_grade, technical_debt_hours,
  uptime_percent, response_time_ms
) VALUES (
  1, '2025-01-08', 85, 92, 88, 95,
  120, 114, 6, 'A', 12.5, 99.9, 145
);
"
```

### 3. Virtual PM AI Chatbot

**Client Access**: Automatic widget on project pages (`/client/project/[id]`)

**Test Steps**:
1. Log in as a client user
2. Navigate to a project page
3. Click the floating chat button (bottom-right)
4. Test queries:
   - "What's the current status of my project?"
   - "When is the next milestone due?"
   - "Can you explain the latest update?"
   - "What files were recently uploaded?"
5. Verify AI responds with project-specific context

**Admin Monitoring**: `/admin/pm-chats`
- View all conversations
- See message counts and last activity
- Read full conversation history

**Quick Action Buttons**:
- Project Status
- Next Milestone
- Recent Updates
- View Files

## API Endpoints

### Project Estimator API
- **POST** `/api/estimate-project` - Submit new estimate request
  - Body: `{ name, email, company, phone, project_description, project_type, timeline_preference, budget_range }`
  - Returns: AI analysis with cost, timeline, tech stack, team size, risk level

### Code Quality API
- **GET** `/api/client/code-quality?projectId={id}` - Fetch metrics
  - Requires: Client authentication token
  - Returns: Latest metrics, health score, deployment history, trends

### PM Chat API
- **GET** `/api/client/pm-chat?conversationId={id}` - Get chat history
- **POST** `/api/client/pm-chat` - Send message
  - Body: `{ projectId, message }`
  - Returns: AI response with context-aware answer

## Rate Limiting

**PM Chat**: 10 messages per minute per conversation
- Prevents abuse
- Returns 429 status if exceeded
- Client-side shows "Please wait" message

## Cost Management

### Estimated API Costs (Anthropic Claude)

**Project Estimator**:
- ~2,000 tokens per request
- Cost: ~$0.006 per estimate
- Expected: 10-50 estimates/month = $0.06-$0.30/month

**PM Chatbot**:
- ~1,500-3,000 tokens per message (includes context)
- Cost: ~$0.005-$0.009 per message
- Expected: 100-500 messages/month = $0.50-$4.50/month

**Total Estimated Cost**: $0.56-$4.80/month for moderate usage

### Cost Optimization Tips
1. Limit conversation history to last 10 messages
2. Cache common responses (project status, milestones)
3. Use rate limiting (already implemented)
4. Monitor usage in Anthropic dashboard

## Email Notifications

Update email configuration in:
- `src/pages/api/estimate-project.ts`

Find and update:
```typescript
// Email notification (configure your email service)
// TODO: Implement email sending
console.log('Send email to:', email);
console.log('Send admin notification');
```

Recommended email services:
- SendGrid
- Resend
- AWS SES
- Postmark

## Troubleshooting

### "API key not found" Error
- Verify `ANTHROPIC_API_KEY` is set in environment variables
- Check `.dev.vars` for local development
- Verify Cloudflare environment variables for production

### "Failed to fetch metrics" Error
- Ensure client is authenticated
- Verify project_id exists in database
- Check that code_quality_metrics table has data for the project

### PM Chat Not Responding
- Verify ANTHROPIC_API_KEY is configured
- Check project_id is valid
- Ensure conversation_id exists in database
- Check browser console for errors
- Verify rate limiting isn't triggered (max 10 msg/min)

### Build Errors
- Clear `.astro` cache: `rm -rf .astro`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check all imports use `@/` alias correctly

## Security Considerations

1. **API Key Protection**
   - Never commit API keys to git
   - Use environment variables only
   - Rotate keys periodically

2. **Client Authentication**
   - All AI features require authentication
   - JWT tokens expire after 30 days
   - Tokens validated on every request

3. **Input Validation**
   - Project descriptions limited to 5000 characters
   - Chat messages limited to 2000 characters
   - SQL injection prevention via parameterized queries

4. **Rate Limiting**
   - PM Chat: 10 messages/minute
   - Project Estimator: No limit (low frequency expected)

## Monitoring & Analytics

### Key Metrics to Track

1. **Project Estimator**
   - Submission rate
   - Conversion rate (new → contacted → converted)
   - Average estimate value
   - Common project types

2. **Code Quality Dashboard**
   - Average health scores across projects
   - Trend analysis (improving/declining)
   - Deployment frequency
   - Common vulnerabilities

3. **PM Chatbot**
   - Message volume per project
   - Response time
   - Common questions (for FAQ)
   - Client satisfaction (future: rating system)

### Database Queries

```sql
-- Estimator conversion funnel
SELECT
  status,
  COUNT(*) as count,
  AVG(estimated_cost_min) as avg_min_cost,
  AVG(estimated_cost_max) as avg_max_cost
FROM project_estimates
GROUP BY status;

-- Code quality trends
SELECT
  DATE(metric_date) as date,
  AVG(code_coverage_percent) as avg_coverage,
  AVG(security_score) as avg_security,
  AVG(performance_score) as avg_performance
FROM code_quality_metrics
WHERE metric_date >= date('now', '-30 days')
GROUP BY DATE(metric_date)
ORDER BY date DESC;

-- Chat activity by project
SELECT
  c.project_id,
  COUNT(DISTINCT c.id) as conversations,
  COUNT(m.id) as total_messages,
  MAX(m.created_at) as last_message
FROM pm_chat_conversations c
LEFT JOIN pm_chat_messages m ON c.id = m.conversation_id
GROUP BY c.project_id;
```

## Next Steps

1. **Configure API Key** (Required)
   - Add ANTHROPIC_API_KEY to environment

2. **Test Features** (Recommended)
   - Submit test estimate
   - Add sample code quality data
   - Test PM chatbot with various questions

3. **Email Integration** (Optional)
   - Set up email service
   - Update notification endpoints
   - Test email delivery

4. **Monitoring** (Recommended)
   - Set up usage alerts in Anthropic dashboard
   - Monitor conversion rates
   - Track client engagement

5. **Marketing** (Optional)
   - Promote AI Estimator on homepage (already added!)
   - Add CTA in email signatures
   - Social media announcements

## Support

For issues or questions:
1. Check this guide first
2. Review error messages in browser console
3. Check Cloudflare logs
4. Verify all environment variables are set

## Changelog

**v1.0.0 - 2025-01-08**
- Initial release of AI features
- AI Project Estimator with Claude integration
- Live Code Quality Dashboard
- Virtual PM AI Chatbot
- Admin interfaces for all features
- Database migrations completed
- Homepage CTA added
- Navigation links added
