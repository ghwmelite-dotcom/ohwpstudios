/**
 * Email notification utility using Resend API
 * For Cloudflare Workers integration
 */

const ADMIN_EMAIL = 'ohwpstudios@gmail.com';

interface EmailOptions {
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send email notification to admin
 */
export async function sendAdminNotification(options: EmailOptions) {
  const { subject, html, from = 'noreply@yourdomain.com' } = options;

  try {
    // For Cloudflare Workers, we'll use Resend API
    // You'll need to set RESEND_API_KEY in your Cloudflare environment variables
    const resendApiKey = process.env.RESEND_API_KEY || 're_demo_key';

    if (resendApiKey === 're_demo_key') {
      console.log('⚠️ Email notification (demo mode - no actual email sent):', subject);
      console.log('To:', ADMIN_EMAIL);
      console.log('From:', from);
      console.log('Content:', html);
      return { success: true, demo: true };
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from,
        to: ADMIN_EMAIL,
        subject,
        html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email');
    }

    console.log('✅ Email notification sent:', subject);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Failed to send email notification:', error);
    // Don't throw error - we don't want email failures to break the main functionality
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Template for contact form notification
 */
export function getContactFormEmailTemplate(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
  phone?: string;
}) {
  return {
    subject: `🔔 New Contact Form Submission: ${data.subject}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .field { margin-bottom: 20px; }
          .label { font-weight: bold; color: #6366f1; margin-bottom: 5px; display: block; }
          .value { background: white; padding: 12px; border-radius: 5px; border-left: 3px solid #6366f1; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 New Contact Form Submission</h1>
          </div>
          <div class="content">
            <div class="field">
              <span class="label">From:</span>
              <div class="value">${data.name}</div>
            </div>
            <div class="field">
              <span class="label">Email:</span>
              <div class="value"><a href="mailto:${data.email}">${data.email}</a></div>
            </div>
            ${data.phone ? `
            <div class="field">
              <span class="label">Phone:</span>
              <div class="value"><a href="tel:${data.phone}">${data.phone}</a></div>
            </div>
            ` : ''}
            <div class="field">
              <span class="label">Subject:</span>
              <div class="value">${data.subject}</div>
            </div>
            <div class="field">
              <span class="label">Message:</span>
              <div class="value">${data.message.replace(/\n/g, '<br>')}</div>
            </div>
          </div>
          <div class="footer">
            <p>Received on ${new Date().toLocaleString()}</p>
            <p>Login to your <a href="https://yourdomain.com/admin/contacts">admin portal</a> to respond</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
}

/**
 * Template for newsletter subscription notification
 */
export function getNewsletterEmailTemplate(data: { email: string }) {
  return {
    subject: '📬 New Newsletter Subscriber',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; text-align: center; }
          .email { background: white; padding: 20px; border-radius: 10px; font-size: 18px; color: #6366f1; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📬 New Newsletter Subscriber</h1>
          </div>
          <div class="content">
            <p>A new user has subscribed to your newsletter!</p>
            <div class="email">${data.email}</div>
            <p>Subscribed on ${new Date().toLocaleString()}</p>
          </div>
          <div class="footer">
            <p>View all subscribers in your <a href="https://yourdomain.com/admin/newsletter">admin portal</a></p>
          </div>
        </div>
      </body>
      </html>
    `
  };
}

/**
 * Template for job application notification
 */
export function getJobApplicationEmailTemplate(data: {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  experience_level: string;
  location: string;
  skills: string;
  portfolio_url?: string;
  linkedin_url?: string;
  github_url?: string;
}) {
  return {
    subject: `💼 New Job Application: ${data.position} - ${data.full_name}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366f1 0%, #ec4899 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .field { margin-bottom: 15px; }
          .label { font-weight: bold; color: #6366f1; margin-bottom: 5px; display: block; font-size: 12px; text-transform: uppercase; }
          .value { background: white; padding: 10px; border-radius: 5px; border-left: 3px solid #6366f1; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .links { margin-top: 20px; }
          .link-btn { display: inline-block; padding: 10px 20px; background: #6366f1; color: white; text-decoration: none; border-radius: 5px; margin: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💼 New Job Application</h1>
            <p style="margin: 10px 0 0 0; font-size: 18px;">${data.position}</p>
          </div>
          <div class="content">
            <div class="grid">
              <div class="field">
                <span class="label">Applicant Name</span>
                <div class="value">${data.full_name}</div>
              </div>
              <div class="field">
                <span class="label">Experience Level</span>
                <div class="value">${data.experience_level}</div>
              </div>
            </div>
            <div class="grid">
              <div class="field">
                <span class="label">Email</span>
                <div class="value"><a href="mailto:${data.email}">${data.email}</a></div>
              </div>
              <div class="field">
                <span class="label">Phone</span>
                <div class="value"><a href="tel:${data.phone}">${data.phone}</a></div>
              </div>
            </div>
            <div class="field">
              <span class="label">Location</span>
              <div class="value">${data.location}</div>
            </div>
            <div class="field">
              <span class="label">Skills</span>
              <div class="value">${data.skills}</div>
            </div>
            ${data.portfolio_url || data.linkedin_url || data.github_url ? `
            <div class="links">
              <span class="label">Links:</span>
              <div>
                ${data.portfolio_url ? `<a href="${data.portfolio_url}" class="link-btn">🌐 Portfolio</a>` : ''}
                ${data.linkedin_url ? `<a href="${data.linkedin_url}" class="link-btn">💼 LinkedIn</a>` : ''}
                ${data.github_url ? `<a href="${data.github_url}" class="link-btn">💻 GitHub</a>` : ''}
              </div>
            </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>Received on ${new Date().toLocaleString()}</p>
            <p>View full application in your <a href="https://yourdomain.com/admin/applications">admin portal</a></p>
          </div>
        </div>
      </body>
      </html>
    `
  };
}
