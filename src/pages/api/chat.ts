import type { APIRoute } from 'astro';

export const prerender = false;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  history?: ChatMessage[];
}

// Mock response for development
function generateMockResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('pricing')) {
    return "Our pricing varies based on project scope and requirements. We offer competitive rates and flexible packages. I'd recommend booking a free consultation where we can discuss your specific needs and provide a detailed quote. You can book at /booking";
  }

  if (lowerMessage.includes('service') || lowerMessage.includes('what do you') || lowerMessage.includes('what can you')) {
    return "We offer comprehensive digital services including Web Development, UI/UX Design, Branding, SEO & Marketing, Cloud Solutions, and Consulting. Each service is tailored to your business needs. Would you like to know more about any specific service?";
  }

  if (lowerMessage.includes('contact') || lowerMessage.includes('reach') || lowerMessage.includes('email') || lowerMessage.includes('phone')) {
    return "You can reach us through our contact form at the bottom of the homepage, call us, or book a free consultation at /booking. We typically respond within 24 hours!";
  }

  if (lowerMessage.includes('portfolio') || lowerMessage.includes('work') || lowerMessage.includes('project') || lowerMessage.includes('example')) {
    return "We've delivered 500+ successful projects across various industries including e-commerce, SaaS, fintech, and more. Check out our portfolio section on the homepage to see some of our featured work, or I can help answer specific questions about our experience.";
  }

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.includes('good morning') || lowerMessage.includes('good afternoon')) {
    return "Hello! 👋 Welcome to our agency. I'm here to help answer questions about our services, portfolio, and how we can help your business. What would you like to know?";
  }

  if (lowerMessage.includes('book') || lowerMessage.includes('meeting') || lowerMessage.includes('call') || lowerMessage.includes('appointment') || lowerMessage.includes('consultation')) {
    return "I'd be happy to help you schedule a consultation! You can book a free 30-minute discovery call at /booking. We'll discuss your project, timeline, and how we can help bring your vision to life.";
  }

  if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
    return "You're very welcome! If you have any other questions, feel free to ask. I'm here to help! 😊";
  }

  if (lowerMessage.includes('team') || lowerMessage.includes('who are you') || lowerMessage.includes('company')) {
    return "We're an award-winning digital agency with 50+ talented team members. We've delivered 500+ projects with a 98% client satisfaction rate. Our expertise spans web development, design, branding, and digital marketing. Would you like to know more about what we can do for your business?";
  }

  if (lowerMessage.includes('how long') || lowerMessage.includes('timeline') || lowerMessage.includes('duration')) {
    return "Project timelines vary based on scope and complexity. A typical website takes 4-8 weeks from start to launch. More complex applications can take 3-6 months. We'll provide a detailed timeline during our consultation. Want to book a call to discuss your project?";
  }

  if (lowerMessage.includes('technology') || lowerMessage.includes('tech stack') || lowerMessage.includes('tools')) {
    return "We work with cutting-edge technologies including React, Next.js, Astro, Node.js, and deploy on platforms like Cloudflare, AWS, and Vercel. We choose the best tools for each project to ensure optimal performance and scalability.";
  }

  // Default response
  return "Thanks for your message! I'm here to help with questions about our services, portfolio, pricing, and process. Feel free to ask anything, or you can book a free consultation at /booking to discuss your project in detail. What would you like to know?";
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as ChatRequest;
    const { message, history = [] } = body;

    console.log('💬 Chat message received:', message);

    if (!message || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
          } 
        }
      );
    }

    // Generate response (using mock for development)
    // In production, you can uncomment the Cloudflare Workers AI code
    const aiResponse = generateMockResponse(message);

    console.log('✅ Chat response generated');

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
        },
      }
    );
  } catch (error) {
    console.error('❌ Chat error:', error);
    return new Response(
      JSON.stringify({
        error: 'Sorry, I encountered an error. Please try again or contact us directly.',
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
        } 
      }
    );
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

