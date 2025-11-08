// Cloudflare Pages Function for AI Chatbot using Google Gemini Flash 2.5
interface Env {
  AI: any;
  GEMINI_API_KEY: string;
  RESEND_API_KEY: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
  userEmail?: string;
  userName?: string;
}

// Function to send email notification
async function sendChatNotification(env: Env, message: string, userName: string, userEmail: string): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured, skipping email notification');
    return;
  }

  try {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'OhWP Studios Chatbot <noreply@ohwpstudios.org>',
        to: ['ohwpstudios@gmail.com'],
        subject: `💬 New Chat Message from ${userName}`,
        html: `
          <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">🤖 New Chat Message</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Someone just chatted with your AI assistant</p>
            </div>
            
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <div style="margin-bottom: 20px;">
                <h3 style="color: #667eea; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">User Information</h3>
                <p style="margin: 5px 0; color: #374151;"><strong>Name:</strong> ${userName}</p>
                <p style="margin: 5px 0; color: #374151;"><strong>Email:</strong> ${userEmail}</p>
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <div style="margin-top: 20px;">
                <h3 style="color: #667eea; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Message</h3>
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea;">
                  <p style="margin: 0; color: #1f2937; line-height: 1.6;">${message}</p>
                </div>
              </div>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                  💡 <em>This is an automated notification from your website chatbot. Reply directly to engage with the user if needed.</em>
                </p>
              </div>
            </div>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Resend API error: ${emailResponse.status} - ${errorText}`);
    }

    console.log('Email notification sent successfully');
  } catch (error) {
    console.error('Error sending email notification:', error);
    throw error;
  }
}

// POST - Handle chat requests
export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  try {
    const body = await request.json() as ChatRequest;
    const { message, history = [] } = body;

    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      );
    }

    // System prompt for technical web development support
    const systemPrompt = `You are an expert AI assistant for OhWP Studios, a premier digital agency specializing in web development and technical solutions.

Your Expertise:
- Technical web development (React, Next.js, Astro, Vue, Angular)
- Backend development (Node.js, Python, PHP, Laravel)
- Cloud infrastructure (AWS, Cloudflare, Azure, GCP)
- Mobile app development (React Native, Flutter)
- UI/UX design and optimization
- Performance optimization and debugging
- SEO and web analytics
- Database design and optimization

Services: Web Development, UI/UX Design, Branding, SEO & Marketing, Cloud Solutions, Technical Consulting, Mobile Apps

Key Facts:
- 500+ projects delivered with 98% client satisfaction
- Lighthouse 100/100 performance scores
- 24/7 technical support available
- Free consultations: /booking

Guidelines:
- Provide detailed technical solutions and explanations
- Help debug code, optimize performance, and solve technical issues
- Be professional, helpful, and comprehensive
- For complex issues, offer to schedule a consultation
- Include code examples when relevant
- Keep responses clear but thorough
- For pricing/business inquiries: direct to /booking or contact form`;

    // Send email notification for new chat
    try {
      await sendChatNotification(env, message, body.userName || 'Anonymous', body.userEmail || 'Not provided');
    } catch (emailError) {
      console.error('Failed to send email notification:', emailError);
      // Don't fail the whole request if email fails
    }

    // Prepare conversation history for Gemini
    const conversationHistory = history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Use Google Gemini Flash 2.5
    let aiResponse: string;
    
    // Check if API key is available
    if (!env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      aiResponse = generateMockResponse(message);
    } else {
      try {
        const geminiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: systemPrompt }]
                },
                ...conversationHistory,
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
              },
              safetySettings: [
                {
                  category: 'HARM_CATEGORY_HARASSMENT',
                  threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                  category: 'HARM_CATEGORY_HATE_SPEECH',
                  threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                }
              ]
            })
          }
        );

        if (!geminiResponse.ok) {
          const errorText = await geminiResponse.text();
          console.error(`Gemini API error: ${geminiResponse.status}`, errorText);
          throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
        }

        const data = await geminiResponse.json();
        console.log('Gemini response:', JSON.stringify(data).substring(0, 200));
        
        aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here to help! Could you please rephrase your question?";
        
      } catch (geminiError) {
        console.error('Gemini API error:', geminiError);
        // Fallback to mock response if Gemini fails
        aiResponse = "I apologize, but I'm having trouble connecting to my AI service right now. Please try again in a moment, or contact us directly at ohwpstudios@gmail.com for immediate assistance.";
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Chat error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('Error details:', {
      message: errorMessage,
      stack: errorStack,
      hasAI: !!(env && env.AI),
    });

    return new Response(
      JSON.stringify({
        error: 'Sorry, I encountered an error. Please try again or contact us directly.',
        details: errorMessage,
        debug: {
          hasAI: !!(env && env.AI),
          timestamp: new Date().toISOString(),
        }
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}

// Mock response for development/testing
function generateMockResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
    return "Our pricing varies based on project scope and requirements. We offer competitive rates and flexible packages. I'd recommend booking a free consultation where we can discuss your specific needs and provide a detailed quote. You can book at /booking";
  }

  if (lowerMessage.includes('service') || lowerMessage.includes('what do you')) {
    return "We offer comprehensive digital services including Web Development, UI/UX Design, Branding, SEO & Marketing, Cloud Solutions, and Consulting. Each service is tailored to your business needs. Would you like to know more about any specific service?";
  }

  if (lowerMessage.includes('contact') || lowerMessage.includes('reach')) {
    return "You can reach us through our contact form at the bottom of the homepage, call us, or book a free consultation at /booking. We typically respond within 24 hours!";
  }

  if (lowerMessage.includes('portfolio') || lowerMessage.includes('work') || lowerMessage.includes('project')) {
    return "We've delivered 500+ successful projects across various industries including e-commerce, SaaS, fintech, and more. Check out our portfolio section on the homepage to see some of our featured work, or I can help answer specific questions about our experience.";
  }

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
    return "Hello! 👋 Welcome to our agency. I'm here to help answer questions about our services, portfolio, and how we can help your business. What would you like to know?";
  }

  if (lowerMessage.includes('book') || lowerMessage.includes('meeting') || lowerMessage.includes('call')) {
    return "I'd be happy to help you schedule a consultation! You can book a free 30-minute discovery call at /booking. We'll discuss your project, timeline, and how we can help bring your vision to life.";
  }

  return "Thanks for your message! I'm here to help with questions about our services, portfolio, pricing, and process. Feel free to ask anything, or you can book a free consultation at /booking to discuss your project in detail.";
}

// Handle OPTIONS request for CORS
export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
