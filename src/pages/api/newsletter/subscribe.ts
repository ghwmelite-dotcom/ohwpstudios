import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  try {
    const db = locals.runtime?.env?.DB;
    const resendApiKey = locals.runtime?.env?.RESEND_API_KEY;

    if (!db) {
      return new Response(
        JSON.stringify({ success: false, message: 'Database not available' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const { email, source = 'inline' } = body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Please provide a valid email address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if already subscribed
    const existing = await db
      .prepare('SELECT * FROM newsletter_subscribers WHERE email = ?')
      .bind(email.toLowerCase())
      .first();

    if (existing) {
      if (existing.status === 'active') {
        return new Response(
          JSON.stringify({ success: false, message: 'This email is already subscribed to our newsletter' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      } else if (existing.status === 'pending') {
        return new Response(
          JSON.stringify({ success: false, message: 'Please check your email to confirm your subscription' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      } else if (existing.status === 'unsubscribed') {
        // Resubscribe - generate new token
        const verificationToken = crypto.randomUUID();

        await db
          .prepare(`
            UPDATE newsletter_subscribers
            SET status = 'pending',
                verification_token = ?,
                source = ?,
                subscribed_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE email = ?
          `)
          .bind(verificationToken, source, email.toLowerCase())
          .run();

        // Send verification email
        if (resendApiKey) {
          await sendVerificationEmail(resendApiKey, email, verificationToken);
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Welcome back! Please check your email to confirm your subscription.'
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();

    // Get user agent
    const userAgent = request.headers.get('user-agent') || '';

    // Insert new subscriber
    await db
      .prepare(`
        INSERT INTO newsletter_subscribers (email, status, verification_token, source, ip_address, user_agent)
        VALUES (?, 'pending', ?, ?, ?, ?)
      `)
      .bind(email.toLowerCase(), verificationToken, source, clientAddress, userAgent)
      .run();

    // Send verification email
    if (resendApiKey) {
      await sendVerificationEmail(resendApiKey, email, verificationToken);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Success! Please check your email to confirm your subscription.'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'An error occurred. Please try again later.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

async function sendVerificationEmail(apiKey: string, email: string, token: string) {
  const resend = new Resend(apiKey);

  const verificationUrl = `${import.meta.env.SITE || 'https://ohwpstudios.org'}/newsletter/verify?token=${token}`;

  try {
    await resend.emails.send({
      from: 'OhWP Studios <noreply@ohwpstudios.org>',
      to: email,
      subject: 'Confirm your newsletter subscription',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Confirm Newsletter Subscription</title>
          </head>
          <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f7f8fa;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 20px; text-align: center;">
                        <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 800;">
                          OhWP Studios
                        </h1>
                      </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px 40px 20px;">
                        <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 700;">
                          Confirm Your Subscription
                        </h2>
                        <p style="margin: 0 0 20px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                          Thank you for subscribing to OhWP Studios newsletter! We're excited to share our latest updates, articles, and insights with you.
                        </p>
                        <p style="margin: 0 0 30px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                          Please click the button below to confirm your email address and complete your subscription:
                        </p>

                        <!-- CTA Button -->
                        <table role="presentation" style="margin: 0 auto;">
                          <tr>
                            <td style="border-radius: 12px; background: linear-gradient(135deg, #6366f1, #8b5cf6);">
                              <a href="${verificationUrl}" style="display: inline-block; padding: 16px 40px; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 16px;">
                                Confirm Subscription
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <!-- Alternative Link -->
                    <tr>
                      <td style="padding: 0 40px 40px;">
                        <p style="margin: 0; color: #9ca3af; font-size: 14px; line-height: 1.6;">
                          Or copy and paste this link into your browser:
                        </p>
                        <p style="margin: 10px 0 0; word-break: break-all;">
                          <a href="${verificationUrl}" style="color: #6366f1; text-decoration: none; font-size: 14px;">
                            ${verificationUrl}
                          </a>
                        </p>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; text-align: center;">
                          If you didn't request this subscription, you can safely ignore this email.
                        </p>
                        <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                          © ${new Date().getFullYear()} OhWP Studios. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    // Don't throw - allow subscription to continue even if email fails
  }
}
