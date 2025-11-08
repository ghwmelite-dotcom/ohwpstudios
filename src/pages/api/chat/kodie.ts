import type { APIRoute } from 'astro';

// Kodie - AI Chat Assistant powered by Google Gemini
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
    const GEMINI_API_KEY = locals.runtime?.env?.GEMINI_API_KEY;

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

    // Get Kodie's response using Gemini AI
    const kodieResponse = await getKodieResponse(message, conversation_history || [], GEMINI_API_KEY);

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

// Call Google Gemini API for intelligent responses (using Gemini 2.5 Flash)
async function callGeminiAPI(message: string, history: any[], apiKey: string): Promise<KodieResponse> {
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // Build conversation context
  const conversationContext = history.slice(-10).map((msg: any) => ({
    role: msg.sender_type === 'visitor' ? 'user' : 'model',
    parts: [{ text: msg.message }]
  }));

  // System prompt to guide Kodie's behavior
  const systemPrompt = `You are Kodie, a helpful and friendly AI assistant for OH WP Studios, a software development agency specializing in:
- Web Development (WordPress, React, Vue, Next.js, etc.)
- Mobile App Development (iOS, Android, React Native, Flutter)
- UI/UX Design
- E-Commerce Solutions
- SEO & Digital Marketing
- AI/ML Integration
- Custom Software Development

Your personality:
- Friendly, professional, and enthusiastic
- Technical but able to explain complex concepts simply
- Proactive in offering solutions
- Honest when you don't know something

Guidelines:
1. Answer technical questions about WordPress, SEO, web development, AI, security, performance, and related topics
2. Provide information about OH WP Studios services and pricing
3. Be conversational and helpful
4. If the question is too complex or requires human expertise, suggest connecting with a specialist (but still try to help first)
5. Keep responses concise but informative (2-4 paragraphs max)
6. Use occasional emojis to be friendly
7. Provide actionable advice when possible

Pricing info:
- Basic websites: $5,000 - $15,000
- Custom web apps: $15,000 - $50,000+
- Mobile apps: $25,000 - $100,000+
- Design projects: $3,000 - $20,000

Contact: ohwpstudios@gmail.com | +233505982361

Now respond to the user's message helpfully and professionally.`;

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [{ text: systemPrompt }]
      },
      ...conversationContext,
      {
        role: 'user',
        parts: [{ text: message }]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    }
  };

  const response = await fetch(GEMINI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Gemini API error:', errorData);
    throw new Error(`Gemini API failed: ${response.status}`);
  }

  const data = await response.json();

  // Extract the response text
  const aiMessage = data.candidates?.[0]?.content?.parts?.[0]?.text ||
                    "I apologize, but I'm having trouble generating a response right now. Could you rephrase your question?";

  // Determine if we should escalate based on response content
  const shouldEscalate = aiMessage.toLowerCase().includes('connect you with') ||
                        aiMessage.toLowerCase().includes('speak with a specialist') ||
                        aiMessage.toLowerCase().includes('human agent');

  // Suggest relevant actions based on the message content
  const suggestedActions: string[] = [];
  const lowerMessage = message.toLowerCase();
  const lowerResponse = aiMessage.toLowerCase();

  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('quote')) {
    suggestedActions.push('Get a quote', 'Schedule consultation');
  } else if (lowerMessage.includes('service') || lowerResponse.includes('service')) {
    suggestedActions.push('View services', 'See portfolio', 'Get quote');
  } else if (lowerMessage.includes('portfolio') || lowerMessage.includes('work')) {
    suggestedActions.push('View portfolio', 'Discuss project');
  } else if (lowerMessage.includes('wordpress') || lowerMessage.includes('seo') || lowerMessage.includes('technical')) {
    suggestedActions.push('Technical consultation', 'Talk to specialist');
  } else {
    suggestedActions.push('Learn more', 'Talk to specialist', 'Get quote');
  }

  return {
    message: aiMessage,
    escalate: shouldEscalate,
    confidence: 0.9,
    suggestedActions: suggestedActions.slice(0, 4)
  };
}

// Kodie's AI Logic using Google Gemini
async function getKodieResponse(message: string, history: any[], apiKey?: string): Promise<KodieResponse> {
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

  // If Gemini API key is available, use AI
  if (apiKey) {
    try {
      const geminiResponse = await callGeminiAPI(message, history, apiKey);
      return geminiResponse;
    } catch (error) {
      console.error('Gemini API error, falling back to rule-based:', error);
      // Fall through to rule-based responses
    }
  }

  // WordPress technical questions
  if (lowerMessage.includes('plugin') || lowerMessage.includes('plugins')) {
    if (lowerMessage.includes('recommend') || lowerMessage.includes('best') || lowerMessage.includes('which')) {
      return {
        message: "Great question about WordPress plugins! Here are my top recommendations:\n\n🔌 **Essential Plugins:**\n• **Security**: Wordfence or Sucuri Security\n• **Performance**: WP Rocket or W3 Total Cache\n• **SEO**: Yoast SEO or Rank Math\n• **Backup**: UpdraftPlus or BackWPup\n• **Forms**: Contact Form 7 or WPForms\n• **Page Builder**: Elementor or Beaver Builder\n\nWhat specific functionality are you looking for? I can give you more targeted recommendations!",
        escalate: false,
        confidence: 0.95,
        suggestedActions: ['Security plugins', 'Performance optimization', 'SEO plugins', 'Talk to specialist']
      };
    }
    if (lowerMessage.includes('conflict') || lowerMessage.includes('error') || lowerMessage.includes('not working')) {
      return {
        message: "Plugin conflicts can be tricky! Here's how to troubleshoot:\n\n🔍 **Step-by-step:**\n1. Deactivate all plugins\n2. Reactivate them one by one\n3. Test after each activation\n4. Identify which plugin causes the issue\n5. Check for updates or alternatives\n\n**Pro tip**: Use a staging site to test plugin combinations safely!\n\nNeed help with a specific plugin conflict? I can guide you through it or connect you with our WordPress specialist.",
        escalate: false,
        confidence: 0.9,
        suggestedActions: ['Troubleshooting guide', 'Talk to specialist', 'Emergency support']
      };
    }
    return {
      message: "I can help with WordPress plugins! Common topics I cover:\n\n• Plugin recommendations for specific needs\n• Troubleshooting plugin conflicts\n• Performance optimization\n• Security best practices\n• Plugin alternatives\n\nWhat specific aspect of plugins would you like to know about?",
      escalate: false,
      confidence: 0.85
    };
  }

  // SEO questions
  if (lowerMessage.includes('seo') || lowerMessage.includes('search engine') || lowerMessage.includes('ranking') || lowerMessage.includes('google')) {
    if (lowerMessage.includes('improve') || lowerMessage.includes('increase') || lowerMessage.includes('better')) {
      return {
        message: "Let me share proven SEO strategies! 📈\n\n**Technical SEO:**\n• Optimize page speed (aim for <3s load time)\n• Ensure mobile responsiveness\n• Create XML sitemap\n• Fix broken links\n• Implement schema markup\n\n**On-Page SEO:**\n• Target relevant keywords\n• Write compelling meta descriptions\n• Use header tags (H1, H2, H3) properly\n• Optimize images (alt text, compression)\n• Internal linking strategy\n\n**Content Strategy:**\n• Create high-quality, original content\n• Answer user search intent\n• Regular content updates\n• Long-form content (1500+ words)\n\nWant to dive deeper into any of these? We also offer comprehensive SEO audits!",
        escalate: false,
        confidence: 0.95,
        suggestedActions: ['SEO audit', 'Technical SEO help', 'Content strategy', 'Get quote']
      };
    }
    if (lowerMessage.includes('keyword')) {
      return {
        message: "Keyword research is crucial for SEO success! Here's my approach:\n\n🔍 **Keyword Research Process:**\n1. **Brainstorm** - List topics relevant to your business\n2. **Use Tools** - Google Keyword Planner, Ahrefs, SEMrush\n3. **Analyze** - Look for high volume, low competition\n4. **Check Intent** - Informational, navigational, or transactional\n5. **Long-tail** - Target specific phrases (less competition)\n\n**Pro Tips:**\n• Focus on search intent, not just volume\n• Analyze competitor keywords\n• Group keywords by topic\n• Target featured snippets\n\nWant help with keyword strategy for your site?",
        escalate: false,
        confidence: 0.92
      };
    }
    return {
      message: "I'm well-versed in SEO! I can help with:\n\n🎯 **SEO Topics:**\n• Technical SEO optimization\n• Keyword research & strategy\n• On-page SEO best practices\n• Link building strategies\n• Local SEO\n• Core Web Vitals\n• Content optimization\n• SEO audits\n\nWhat SEO challenge are you facing?",
      escalate: false,
      confidence: 0.88,
      suggestedActions: ['Technical SEO', 'Keyword research', 'SEO audit', 'Get expert help']
    };
  }

  // Web development questions
  if (lowerMessage.includes('javascript') || lowerMessage.includes('react') || lowerMessage.includes('vue') ||
      lowerMessage.includes('angular') || lowerMessage.includes('frontend') || lowerMessage.includes('backend') ||
      lowerMessage.includes('node') || lowerMessage.includes('api') || lowerMessage.includes('database')) {
    if (lowerMessage.includes('which') || lowerMessage.includes('best') || lowerMessage.includes('should i use')) {
      return {
        message: "Great question about technology choices! Here's my take:\n\n**Frontend Frameworks:**\n• **React** - Most popular, great ecosystem, flexible\n• **Vue.js** - Easy to learn, progressive framework\n• **Angular** - Enterprise-grade, full-featured\n• **Next.js** - React with SSR, excellent performance\n\n**Backend:**\n• **Node.js** - JavaScript everywhere, fast, scalable\n• **Python/Django** - Rapid development, clean syntax\n• **PHP/Laravel** - Mature ecosystem, great for web apps\n\n**Databases:**\n• **PostgreSQL** - Robust relational database\n• **MongoDB** - Flexible NoSQL option\n• **MySQL** - Reliable, widely supported\n\n💡 **My recommendation depends on your project:**\nWhat are you building? I can give more specific advice!",
        escalate: false,
        confidence: 0.9,
        suggestedActions: ['Project consultation', 'Tech stack advice', 'Development services']
      };
    }
    if (lowerMessage.includes('error') || lowerMessage.includes('debug') || lowerMessage.includes('fix')) {
      return {
        message: "Debugging can be challenging! Here are my tips:\n\n🐛 **Debugging Strategy:**\n1. **Read the error** - Understanding the message is key\n2. **Check console** - Browser DevTools or server logs\n3. **Isolate the issue** - Comment out code sections\n4. **Use debugger** - Set breakpoints, step through code\n5. **Search solutions** - Stack Overflow, GitHub issues\n6. **Ask for help** - Fresh eyes catch things we miss\n\n**Common issues:**\n• Syntax errors (missing brackets, semicolons)\n• Type mismatches\n• Async/await problems\n• CORS issues\n• Undefined variables\n\nWhat error are you encountering? Share the details and I can help troubleshoot or connect you with a developer!",
        escalate: false,
        confidence: 0.85,
        suggestedActions: ['Describe error', 'Talk to developer', 'Emergency support']
      };
    }
    return {
      message: "I love talking web development! 💻\n\n**Areas I can help with:**\n• Frontend frameworks (React, Vue, Angular)\n• Backend development (Node.js, Python, PHP)\n• API design & integration\n• Database architecture\n• Performance optimization\n• Security best practices\n• Modern web technologies\n• Architecture decisions\n\nWhat development topic would you like to explore?",
      escalate: false,
      confidence: 0.87
    };
  }

  // AI/Machine Learning questions
  if (lowerMessage.includes('ai') || lowerMessage.includes('artificial intelligence') ||
      lowerMessage.includes('machine learning') || lowerMessage.includes('ml') ||
      lowerMessage.includes('chatbot') || lowerMessage.includes('automation')) {
    if (lowerMessage.includes('how') || lowerMessage.includes('what is') || lowerMessage.includes('explain')) {
      return {
        message: "AI and machine learning are transforming technology! Let me break it down:\n\n🤖 **AI Basics:**\n• **AI** - Systems that mimic human intelligence\n• **Machine Learning** - AI that learns from data\n• **Deep Learning** - ML using neural networks\n• **NLP** - Understanding human language (like I do!)\n\n**Common AI Applications:**\n• Chatbots & virtual assistants\n• Image recognition\n• Recommendation systems\n• Predictive analytics\n• Process automation\n• Content generation\n\n**AI in Web Development:**\n• Personalized user experiences\n• Smart search functionality\n• Automated testing\n• Content optimization\n• Security threat detection\n\nInterested in implementing AI in your project? We build custom AI solutions!",
        escalate: false,
        confidence: 0.92,
        suggestedActions: ['AI development services', 'Chatbot solutions', 'Automation consulting']
      };
    }
    if (lowerMessage.includes('implement') || lowerMessage.includes('integrate') || lowerMessage.includes('build')) {
      return {
        message: "Implementing AI in your project is exciting! Here's what to consider:\n\n**AI Integration Options:**\n\n1️⃣ **API Services** (Fastest)\n• OpenAI GPT models\n• Google Cloud AI\n• AWS AI services\n• Pros: Quick setup, no ML expertise needed\n\n2️⃣ **Pre-trained Models**\n• TensorFlow.js\n• ONNX models\n• Hugging Face transformers\n• Pros: Customizable, works offline\n\n3️⃣ **Custom ML Models** (Most powerful)\n• Train on your data\n• Full control\n• Pros: Tailored to your needs\n\n**Popular Use Cases:**\n• Smart chatbots (like me!)\n• Content recommendations\n• Image/video analysis\n• Sentiment analysis\n• Predictive analytics\n\nWant to discuss AI implementation for your project? Our team can help!",
        escalate: false,
        confidence: 0.88,
        suggestedActions: ['AI consultation', 'Custom AI development', 'Get quote']
      };
    }
    return {
      message: "I'm passionate about AI! 🤖 Here's what I can discuss:\n\n• AI fundamentals & concepts\n• Machine learning basics\n• Chatbot development (I'm proof it works!)\n• AI integration strategies\n• Popular AI tools & frameworks\n• Practical AI applications\n• Automation opportunities\n• Ethical AI considerations\n\nWhat aspect of AI interests you most?",
      escalate: false,
      confidence: 0.85
    };
  }

  // Performance optimization
  if (lowerMessage.includes('performance') || lowerMessage.includes('speed') ||
      lowerMessage.includes('slow') || lowerMessage.includes('optimize') || lowerMessage.includes('faster')) {
    return {
      message: "Website performance is critical! Here's how to optimize:\n\n⚡ **Performance Optimization:**\n\n**Frontend:**\n• Minimize HTTP requests\n• Compress images (WebP format)\n• Use CDN for static assets\n• Implement lazy loading\n• Minify CSS/JavaScript\n• Enable browser caching\n\n**Backend:**\n• Database query optimization\n• Server-side caching (Redis)\n• Use efficient algorithms\n• Optimize API responses\n• Enable GZIP compression\n\n**WordPress Specific:**\n• WP Rocket or W3 Total Cache\n• Image optimization plugins\n• Limit plugins\n• Use quality hosting\n• PHP 8+ for better performance\n\n**Target Metrics:**\n• First Contentful Paint < 1.8s\n• Largest Contentful Paint < 2.5s\n• Total Blocking Time < 200ms\n\nWant a performance audit of your site?",
      escalate: false,
      confidence: 0.93,
      suggestedActions: ['Performance audit', 'Optimization service', 'Speed test']
    };
  }

  // Security questions
  if (lowerMessage.includes('security') || lowerMessage.includes('hack') ||
      lowerMessage.includes('secure') || lowerMessage.includes('ssl') || lowerMessage.includes('https')) {
    return {
      message: "Security is paramount! Here's how to protect your site:\n\n🔒 **Essential Security Measures:**\n\n**WordPress Security:**\n• Use strong, unique passwords\n• Enable 2FA (Two-Factor Authentication)\n• Keep WordPress, themes & plugins updated\n• Install security plugin (Wordfence/Sucuri)\n• Limit login attempts\n• Hide WordPress version\n• Regular backups\n\n**General Web Security:**\n• SSL certificate (HTTPS)\n• WAF (Web Application Firewall)\n• DDoS protection (Cloudflare)\n• Regular security audits\n• Input validation & sanitization\n• SQL injection prevention\n• XSS protection\n\n**Red Flags:**\n⚠️ Suspicious login attempts\n⚠️ Unexpected file changes\n⚠️ Slow site performance\n⚠️ Strange admin users\n\nThink your site is compromised? Let's connect you with our security team immediately!",
      escalate: false,
      confidence: 0.91,
      suggestedActions: ['Security audit', 'Emergency security help', 'SSL setup']
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
      message: "You can reach us through:\n\n📧 Email: ohwpstudios@gmail.com\n📞 Phone: +233505982361\n🕐 Hours: Monday-Friday, 9 AM - 6 PM EST\n\nOr continue chatting with me, and I can help answer your questions right away! Would you like to schedule a call or continue our conversation here?",
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
