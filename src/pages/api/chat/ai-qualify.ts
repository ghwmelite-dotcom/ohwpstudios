import type { APIRoute } from 'astro';

/**
 * AI Lead Qualification System
 * Analyzes conversation to extract project requirements, budget, timeline, and sentiment
 * Automatically flags hot leads and sends project briefs to sales team
 */

interface QualificationResult {
  isQualified: boolean;
  confidence: number;
  projectType?: string;
  budget?: string;
  timeline?: string;
  requirements: string[];
  sentiment: 'hot' | 'warm' | 'cold';
  sentimentScore: number;
  recommendedAction: 'book_meeting' | 'send_estimate' | 'continue_chat' | 'escalate';
  estimate?: {
    range: string;
    breakdown: string[];
  };
}

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;
    const GEMINI_API_KEY = locals.runtime?.env?.GEMINI_API_KEY;
    const RESEND_API_KEY = locals.runtime?.env?.RESEND_API_KEY;

    if (!db) {
      return new Response(JSON.stringify({ success: false, error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();
    const { conversation_id, conversation_history, user_email, user_name } = data;

    if (!conversation_history || conversation_history.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Conversation history is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Analyze conversation with AI
    const qualification = await analyzeConversation(conversation_history, GEMINI_API_KEY);

    // Save qualification result to database
    if (qualification.isQualified) {
      await db.prepare(`
        INSERT INTO chat_qualified_leads (
          conversation_id, project_type, budget_range, timeline,
          requirements_json, sentiment_score, is_hot_lead, estimate_provided,
          user_email, user_name, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        conversation_id,
        qualification.projectType || 'Unknown',
        qualification.budget || 'Not specified',
        qualification.timeline || 'Not specified',
        JSON.stringify(qualification.requirements),
        qualification.sentimentScore,
        qualification.sentiment === 'hot' ? 1 : 0,
        qualification.estimate ? JSON.stringify(qualification.estimate) : null,
        user_email || 'Not provided',
        user_name || 'Anonymous'
      ).run();

      // If hot lead, send email notification
      if (qualification.sentiment === 'hot' && RESEND_API_KEY) {
        await sendHotLeadNotification({
          conversation_id,
          user_name: user_name || 'Anonymous',
          user_email: user_email || 'Not provided',
          projectType: qualification.projectType,
          budget: qualification.budget,
          timeline: qualification.timeline,
          requirements: qualification.requirements,
          sentimentScore: qualification.sentimentScore
        }, RESEND_API_KEY);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      qualification
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in AI qualification:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to qualify lead'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function analyzeConversation(history: any[], apiKey?: string): Promise<QualificationResult> {
  if (!apiKey) {
    // Fallback to rule-based analysis if no API key
    return ruleBasedAnalysis(history);
  }

  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // Build conversation transcript
  const transcript = history.map((msg: any) =>
    `${msg.sender_type === 'visitor' ? 'User' : 'Assistant'}: ${msg.message}`
  ).join('\n');

  const analysisPrompt = `You are an expert sales analyst. Analyze this conversation and extract key information.

CONVERSATION:
${transcript}

Analyze the conversation and provide a JSON response with the following structure:
{
  "isQualified": boolean (true if user shows serious interest in a project),
  "confidence": number (0-1, how confident you are in this assessment),
  "projectType": string (e.g., "Website Development", "Mobile App", "E-Commerce", "SEO Services", "Custom Software"),
  "budget": string (extract budget range if mentioned, e.g., "$10k-$25k", "Under $10k", "$50k+", or "Not specified"),
  "timeline": string (e.g., "ASAP", "1-2 months", "Q1 2025", or "Not specified"),
  "requirements": array of strings (key project requirements mentioned),
  "sentiment": string ("hot" if very interested/ready to buy, "warm" if interested but researching, "cold" if just browsing),
  "sentimentScore": number (0-1, where 1 is extremely interested),
  "recommendedAction": string ("book_meeting" if ready to discuss, "send_estimate" if asking about pricing, "continue_chat" if needs more info, "escalate" if complex/urgent)
}

GUIDELINES:
- "hot" leads: Ready to start, asking about pricing/timeline, have budget, urgent need
- "warm" leads: Interested, asking detailed questions, but not urgent
- "cold" leads: General questions, "just looking", no timeline/budget mentioned
- Mark as qualified if they discuss a specific project need or ask about services
- Extract budget even if approximate (e.g., "not much" = "Under $5k", "enterprise" = "$50k+")
- Include specific tech requirements (React, Node.js, iOS, etc.) in requirements array

Respond ONLY with valid JSON, no additional text.`;

  const payload = {
    contents: [{
      role: 'user',
      parts: [{ text: analysisPrompt }]
    }],
    generationConfig: {
      temperature: 0.3, // Lower temperature for more consistent extraction
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }
  };

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    console.error('Gemini API error in qualification');
    return ruleBasedAnalysis(history);
  }

  const data = await response.json();
  const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    // Extract JSON from response (remove markdown code blocks if present)
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    const qualification = JSON.parse(jsonMatch[0]);

    // Add estimate if budget is mentioned
    if (qualification.budget && qualification.budget !== 'Not specified') {
      qualification.estimate = generateEstimate(
        qualification.projectType,
        qualification.budget,
        qualification.requirements
      );
    }

    return qualification;
  } catch (error) {
    console.error('Error parsing AI qualification response:', error);
    return ruleBasedAnalysis(history);
  }
}

// Fallback rule-based analysis
function ruleBasedAnalysis(history: any[]): QualificationResult {
  const transcript = history.map(m => m.message).join(' ').toLowerCase();

  const result: QualificationResult = {
    isQualified: false,
    confidence: 0.5,
    requirements: [],
    sentiment: 'cold',
    sentimentScore: 0.3,
    recommendedAction: 'continue_chat'
  };

  // Detect project type
  if (transcript.includes('website') || transcript.includes('web')) {
    result.projectType = 'Website Development';
    result.isQualified = true;
  } else if (transcript.includes('mobile') || transcript.includes('app')) {
    result.projectType = 'Mobile App';
    result.isQualified = true;
  } else if (transcript.includes('ecommerce') || transcript.includes('shop') || transcript.includes('store')) {
    result.projectType = 'E-Commerce';
    result.isQualified = true;
  } else if (transcript.includes('seo') || transcript.includes('ranking')) {
    result.projectType = 'SEO Services';
    result.isQualified = true;
  }

  // Detect budget
  const budgetMatch = transcript.match(/\$(\d+)[k,]?/);
  if (budgetMatch) {
    result.budget = `~$${budgetMatch[1]}k`;
  } else if (transcript.includes('budget')) {
    result.budget = 'Mentioned but not specified';
  }

  // Detect timeline urgency
  if (transcript.includes('asap') || transcript.includes('urgent') || transcript.includes('immediately')) {
    result.timeline = 'ASAP';
    result.sentimentScore += 0.3;
  } else if (transcript.includes('month') || transcript.includes('weeks')) {
    result.timeline = '1-3 months';
    result.sentimentScore += 0.2;
  }

  // Sentiment analysis
  const hotKeywords = ['price', 'cost', 'quote', 'hire', 'start', 'when can', 'need help'];
  const hotCount = hotKeywords.filter(kw => transcript.includes(kw)).length;

  if (hotCount >= 3) {
    result.sentiment = 'hot';
    result.sentimentScore = Math.min(0.9, result.sentimentScore + 0.4);
    result.recommendedAction = 'book_meeting';
  } else if (hotCount >= 1) {
    result.sentiment = 'warm';
    result.sentimentScore = Math.min(0.7, result.sentimentScore + 0.2);
    result.recommendedAction = 'send_estimate';
  }

  result.confidence = result.isQualified ? 0.7 : 0.5;

  return result;
}

function generateEstimate(projectType: string, budgetStr: string, requirements: string[]): any {
  // Base estimates in USD (reduced by 30% for competitive pricing)
  const estimatesUSD: Record<string, any> = {
    'Website Development': {
      range: '$3,500 - $17,500',
      rangeGHS: 'GH₵42,000 - GH₵210,000',
      breakdown: [
        'Design & UX: $1,400 - $5,600',
        'Development: $2,100 - $8,400',
        'Content & SEO: $350 - $2,100',
        'Testing & Launch: $350 - $1,400'
      ],
      breakdownGHS: [
        'Design & UX: GH₵16,800 - GH₵67,200',
        'Development: GH₵25,200 - GH₵100,800',
        'Content & SEO: GH₵4,200 - GH₵25,200',
        'Testing & Launch: GH₵4,200 - GH₵16,800'
      ]
    },
    'Mobile App': {
      range: '$17,500 - $70,000+',
      rangeGHS: 'GH₵210,000 - GH₵840,000+',
      breakdown: [
        'iOS Development: $10,500 - $35,000',
        'Android Development: $10,500 - $35,000',
        'Backend API: $7,000 - $21,000',
        'Design & UX: $3,500 - $10,500'
      ],
      breakdownGHS: [
        'iOS Development: GH₵126,000 - GH₵420,000',
        'Android Development: GH₵126,000 - GH₵420,000',
        'Backend API: GH₵84,000 - GH₵252,000',
        'Design & UX: GH₵42,000 - GH₵126,000'
      ]
    },
    'E-Commerce': {
      range: '$7,000 - $35,000+',
      rangeGHS: 'GH₵84,000 - GH₵420,000+',
      breakdown: [
        'Platform Setup: $2,100 - $7,000',
        'Custom Features: $3,500 - $17,500',
        'Payment Integration: $1,400 - $5,600',
        'SEO & Marketing: $1,400 - $4,900'
      ],
      breakdownGHS: [
        'Platform Setup: GH₵25,200 - GH₵84,000',
        'Custom Features: GH₵42,000 - GH₵210,000',
        'Payment Integration: GH₵16,800 - GH₵67,200',
        'SEO & Marketing: GH₵16,800 - GH₵58,800'
      ]
    },
    'SEO Services': {
      range: '$1,050 - $3,500/month',
      rangeGHS: 'GH₵12,600 - GH₵42,000/month',
      breakdown: [
        'Technical SEO Audit: $1,050',
        'Monthly Optimization: $700 - $2,100',
        'Content Strategy: $350 - $1,050',
        'Link Building: $350 - $700'
      ],
      breakdownGHS: [
        'Technical SEO Audit: GH₵12,600',
        'Monthly Optimization: GH₵8,400 - GH₵25,200',
        'Content Strategy: GH₵4,200 - GH₵12,600',
        'Link Building: GH₵4,200 - GH₵8,400'
      ]
    }
  };

  return estimatesUSD[projectType] || {
    range: 'Custom quote needed',
    rangeGHS: 'Custom quote needed',
    breakdown: ['Contact us for detailed estimate based on your specific requirements'],
    breakdownGHS: ['Contact us for detailed estimate based on your specific requirements']
  };
}

async function sendHotLeadNotification(lead: any, resendApiKey: string) {
  try {
    const emailHtml = `
      <h2>🔥 Hot Lead Alert!</h2>
      <p><strong>New qualified lead from chat:</strong></p>
      <ul>
        <li><strong>Name:</strong> ${lead.user_name}</li>
        <li><strong>Email:</strong> ${lead.user_email}</li>
        <li><strong>Project Type:</strong> ${lead.projectType || 'Not specified'}</li>
        <li><strong>Budget:</strong> ${lead.budget || 'Not specified'}</li>
        <li><strong>Timeline:</strong> ${lead.timeline || 'Not specified'}</li>
        <li><strong>Sentiment Score:</strong> ${(lead.sentimentScore * 100).toFixed(0)}%</li>
      </ul>
      <h3>Requirements:</h3>
      <ul>
        ${lead.requirements.map((req: string) => `<li>${req}</li>`).join('')}
      </ul>
      <p><strong>Conversation ID:</strong> ${lead.conversation_id}</p>
      <p><em>Review the full conversation in your admin panel.</em></p>
    `;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Kodie AI <noreply@ohwpstudios.org>',
        to: ['ohwpstudios@gmail.com'],
        subject: `🔥 Hot Lead: ${lead.projectType} - ${lead.user_name}`,
        html: emailHtml
      })
    });
  } catch (error) {
    console.error('Error sending hot lead notification:', error);
  }
}
