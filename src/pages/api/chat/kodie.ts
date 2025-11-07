import type { APIRoute } from 'astro';

// Kodie - AI Chat Assistant
// Handles initial customer inquiries and escalates to human agents when needed

interface KodieResponse {
  message: string;
  escalate: boolean;
  confidence: number;
  suggestedActions?: string[];
}

// POST: Get AI response from Kodie
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
    const { message, conversation_id, conversation_history } = data;

    if (!message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Message is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get Kodie's response
    const kodieResponse = await getKodieResponse(message, conversation_history || []);

    // If Kodie decides to escalate, update conversation status
    if (kodieResponse.escalate && conversation_id) {
      await db.prepare(`
        UPDATE chat_conversations
        SET status = 'pending', priority = 'high'
        WHERE id = ?
      `).bind(conversation_id).run();
    }

    // Save Kodie's response to database if conversation_id is provided
    if (conversation_id) {
      await db.prepare(`
        INSERT INTO chat_messages (
          conversation_id, message_text, message_type, sender_type, sender_name, sent_at
        ) VALUES (?, ?, 'text', 'operator', 'Kodie', CURRENT_TIMESTAMP)
      `).bind(
        conversation_id,
        kodieResponse.message
      ).run();

      // Update conversation counts
      await db.prepare(`
        UPDATE chat_conversations
        SET total_messages = total_messages + 1, operator_messages = operator_messages + 1, last_message_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(conversation_id).run();

      // If escalating, add a system message
      if (kodieResponse.escalate) {
        await db.prepare(`
          INSERT INTO chat_messages (
            conversation_id, message_text, message_type, sender_type, sender_name, sent_at
          ) VALUES (?, ?, 'text', 'system', 'System', CURRENT_TIMESTAMP)
        `).bind(
          conversation_id,
          '🔔 This conversation has been escalated to our support team. A human agent will be with you shortly!'
        ).run();

        await db.prepare(`
          UPDATE chat_conversations
          SET total_messages = total_messages + 1
          WHERE id = ?
        `).bind(conversation_id).run();
      }
    }

    return new Response(JSON.stringify({
      success: true,
      response: kodieResponse
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error getting Kodie response:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to get response'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Kodie's AI Logic
async function getKodieResponse(message: string, history: any[]): Promise<KodieResponse> {
  const lowerMessage = message.toLowerCase();

  // Escalation triggers - when Kodie should hand off to human
  const escalationKeywords = [
    'speak to human', 'talk to person', 'real person', 'human agent',
    'not helping', 'frustrated', 'angry', 'complaint', 'refund',
    'cancel', 'lawsuit', 'legal', 'emergency', 'urgent problem',
    'very urgent', 'manager', 'supervisor'
  ];

  // Check if should escalate immediately
  const shouldEscalate = escalationKeywords.some(keyword => lowerMessage.includes(keyword));

  if (shouldEscalate) {
    return {
      message: "I understand this is important to you. Let me connect you with one of our human support specialists who can better assist you with this matter. They'll be with you shortly! 🙋‍♂️",
      escalate: true,
      confidence: 1.0
    };
  }

  // Greeting detection
  if (lowerMessage.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)) {
    return {
      message: "Hi there! 👋 I'm Kodie, your AI assistant at OH WP Studios. I'm here to help answer questions about our services, pricing, and technical challenges. How can I assist you today?",
      escalate: false,
      confidence: 1.0,
      suggestedActions: ['Services', 'Pricing', 'Portfolio', 'Technical Support']
    };
  }

  // Services inquiry
  if (lowerMessage.includes('service') || lowerMessage.includes('what do you do') || lowerMessage.includes('what can you help')) {
    return {
      message: "Great question! OH WP Studios specializes in:\n\n🌐 Web Development - Custom websites and web applications\n📱 Mobile Apps - iOS and Android development\n🎨 UI/UX Design - Beautiful, user-friendly interfaces\n✨ Branding - Logo and brand identity design\n🛒 E-Commerce - Online stores and shopping platforms\n📊 SEO & Marketing - Digital marketing and optimization\n\nWhich service are you interested in learning more about?",
      escalate: false,
      confidence: 1.0,
      suggestedActions: ['Get a quote', 'See portfolio', 'Discuss project']
    };
  }

  // Pricing inquiry
  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much') || lowerMessage.includes('quote')) {
    return {
      message: "I'd be happy to help with pricing information! 💰\n\nOur projects typically range from:\n• Basic websites: $5,000 - $15,000\n• Custom web apps: $15,000 - $50,000+\n• Mobile apps: $25,000 - $100,000+\n• Design projects: $3,000 - $20,000\n\nThe exact cost depends on your specific requirements, features, and timeline. Would you like to schedule a free consultation to discuss your project in detail and get an accurate quote?",
      escalate: false,
      confidence: 0.9,
      suggestedActions: ['Schedule consultation', 'Tell me more about your project', 'See portfolio']
    };
  }

  // Timeline inquiry
  if (lowerMessage.includes('how long') || lowerMessage.includes('timeline') || lowerMessage.includes('duration') || lowerMessage.includes('when')) {
    return {
      message: "Project timelines vary based on complexity and scope:\n\n⏱️ Small websites: 2-4 weeks\n⏱️ Medium projects: 1-3 months\n⏱️ Large applications: 3-6+ months\n\nWe provide detailed timelines after our initial project consultation. We also offer expedited delivery for urgent projects. What type of project are you planning?",
      escalate: false,
      confidence: 0.9,
      suggestedActions: ['Discuss my project', 'Schedule call', 'Expedited options']
    };
  }

  // Portfolio inquiry
  if (lowerMessage.includes('portfolio') || lowerMessage.includes('examples') || lowerMessage.includes('work') || lowerMessage.includes('projects you')) {
    return {
      message: "I'd love to show you our work! 🎨\n\nYou can view our portfolio at: https://ohwpstudios.com/#portfolio\n\nWe've completed projects in:\n• E-commerce platforms\n• SaaS applications\n• Healthcare systems\n• Educational platforms\n• Fintech solutions\n\nIs there a specific industry or type of project you'd like to see examples of?",
      escalate: false,
      confidence: 1.0,
      suggestedActions: ['View full portfolio', 'E-commerce examples', 'SaaS examples']
    };
  }

  // Technical support - WordPress specific
  if (lowerMessage.includes('wordpress') || lowerMessage.includes('wp')) {
    if (lowerMessage.includes('error') || lowerMessage.includes('problem') || lowerMessage.includes('not working') || lowerMessage.includes('broken')) {
      return {
        message: "I can help with WordPress technical issues! 🔧\n\nCommon WordPress problems I can assist with:\n• Plugin conflicts\n• Theme issues\n• Performance optimization\n• Security concerns\n• Database errors\n• White screen of death\n\nCould you describe the specific error or issue you're experiencing? If it's a complex technical problem, I can connect you with our WordPress specialist.",
        escalate: false,
        confidence: 0.7,
        suggestedActions: ['Describe the error', 'Connect to specialist', 'View WordPress services']
      };
    }
    return {
      message: "We're WordPress experts! 💙\n\nWe offer:\n• WordPress website development\n• Custom theme creation\n• Plugin development\n• WooCommerce solutions\n• WordPress maintenance & support\n• Security hardening\n• Performance optimization\n\nWhat WordPress services are you looking for?",
      escalate: false,
      confidence: 1.0,
      suggestedActions: ['Custom development', 'Maintenance plans', 'Get a quote']
    };
  }

  // Technical issues - general
  if (lowerMessage.includes('bug') || lowerMessage.includes('error') || lowerMessage.includes('not working') || lowerMessage.includes('broken') || lowerMessage.includes('issue')) {
    // Check if they're an existing client
    if (lowerMessage.includes('existing') || lowerMessage.includes('current') || lowerMessage.includes('already') || lowerMessage.includes('project')) {
      return {
        message: "I understand you're experiencing a technical issue with an existing project. For the fastest support, I'm going to connect you with our technical support team who have access to your project details. They'll be able to diagnose and resolve the issue quickly. 🛠️\n\nOne moment please...",
        escalate: true,
        confidence: 0.8
      };
    }

    return {
      message: "I'm sorry to hear you're experiencing a technical issue. I can help troubleshoot common problems or connect you with our technical team for complex issues.\n\nCould you tell me:\n1. What type of website/application is it?\n2. What specific error or behavior are you seeing?\n3. When did this issue start?\n\nThis will help me assist you better!",
      escalate: false,
      confidence: 0.7,
      suggestedActions: ['Describe the issue', 'Talk to specialist', 'Emergency support']
    };
  }

  // Contact information
  if (lowerMessage.includes('contact') || lowerMessage.includes('email') || lowerMessage.includes('phone') || lowerMessage.includes('call')) {
    return {
      message: "You can reach us through:\n\n📧 Email: hello@ohwpstudios.com\n📞 Phone: +1 (555) 123-4567\n🕐 Hours: Monday-Friday, 9 AM - 6 PM EST\n\nOr continue chatting with me, and I can help answer your questions right away! Would you like to schedule a call or continue our conversation here?",
      escalate: false,
      confidence: 1.0,
      suggestedActions: ['Schedule a call', 'Continue chatting', 'Send email']
    };
  }

  // Complex or unclear requests
  const conversationLength = history.length;

  // If conversation is getting long and Kodie hasn't been helpful, escalate
  if (conversationLength > 6) {
    return {
      message: "I want to make sure you get the best help possible. It seems like you might benefit from speaking with one of our specialists who can provide more detailed assistance. Would you like me to connect you with a human agent?",
      escalate: false,
      confidence: 0.5,
      suggestedActions: ['Yes, connect me', 'No, continue with Kodie', 'Tell me more']
    };
  }

  // Default response when uncertain
  return {
    message: "I want to make sure I understand your question correctly. I can help with:\n\n• Information about our services\n• Pricing and quotes\n• Project timelines\n• Technical WordPress support\n• Scheduling consultations\n• Portfolio examples\n\nCould you clarify what you'd like to know more about? Or, if you prefer, I can connect you with a human agent for more personalized assistance.",
    escalate: false,
    confidence: 0.4,
    suggestedActions: ['Services info', 'Get pricing', 'Talk to human', 'See portfolio']
  };
}

// Disable prerendering for this API route
export const prerender = false;
