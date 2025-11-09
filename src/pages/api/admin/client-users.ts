import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

// Password hashing function (from client login)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// GET - Fetch all client users
export const GET: APIRoute = async ({ request, locals }) => {
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
    const session = await db
      .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(token)
      .first();

    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all client users (exclude password hash in response)
    const users = await db
      .prepare(`
        SELECT
          id, email, company_name, contact_name, phone, status,
          created_at, updated_at, token_expires_at
        FROM client_users
        ORDER BY created_at DESC
      `)
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        users: users.results || []
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching client users:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch client users' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// POST - Create new client user
export const POST: APIRoute = async ({ request, locals }) => {
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
    const session = await db
      .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(token)
      .first();

    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.email || !data.password || !data.company_name || !data.contact_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email, password, company name, and contact name are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already exists
    const existingUser = await db
      .prepare('SELECT id FROM client_users WHERE email = ?')
      .bind(data.email.toLowerCase())
      .first();

    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email already exists' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Insert new client user
    const result = await db
      .prepare(`
        INSERT INTO client_users (
          email, password_hash, company_name, contact_name, phone, status
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(
        data.email.toLowerCase(),
        passwordHash,
        data.company_name,
        data.contact_name,
        data.phone || null,
        data.status || 'active'
      )
      .run();

    if (!result.success) {
      throw new Error('Failed to create client user');
    }

    // Send welcome email with login credentials
    const resendApiKey = locals.runtime?.env?.RESEND_API_KEY;
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);

      try {
        await resend.emails.send({
          from: 'OhWP Studios <noreply@ohwpstudios.org>',
          to: [data.email.toLowerCase()],
          subject: 'Welcome to Your Client Portal - OhWP Studios',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                  background-color: #f4f4f4;
                }
                .container {
                  background: white;
                  border-radius: 8px;
                  padding: 40px;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                  padding-bottom: 20px;
                  border-bottom: 2px solid #6366f1;
                }
                .logo {
                  font-size: 28px;
                  font-weight: bold;
                  background: linear-gradient(135deg, #6366f1, #ec4899);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  margin-bottom: 10px;
                }
                h1 {
                  color: #1f2937;
                  font-size: 24px;
                  margin: 0;
                }
                .credentials-box {
                  background: #f8fafc;
                  border: 2px solid #e2e8f0;
                  border-radius: 8px;
                  padding: 20px;
                  margin: 25px 0;
                }
                .credential-row {
                  margin: 12px 0;
                  display: flex;
                  align-items: baseline;
                }
                .credential-label {
                  font-weight: 600;
                  color: #475569;
                  min-width: 120px;
                }
                .credential-value {
                  color: #1f2937;
                  font-family: 'Courier New', monospace;
                  background: white;
                  padding: 4px 8px;
                  border-radius: 4px;
                  border: 1px solid #cbd5e1;
                }
                .btn {
                  display: inline-block;
                  background: linear-gradient(135deg, #6366f1, #8b5cf6);
                  color: white;
                  padding: 14px 28px;
                  text-decoration: none;
                  border-radius: 6px;
                  font-weight: 600;
                  margin: 20px 0;
                  text-align: center;
                }
                .warning {
                  background: #fef3c7;
                  border-left: 4px solid #f59e0b;
                  padding: 15px;
                  margin: 20px 0;
                  border-radius: 4px;
                  font-size: 14px;
                }
                .footer {
                  text-align: center;
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #e2e8f0;
                  color: #64748b;
                  font-size: 14px;
                }
                .help-text {
                  color: #64748b;
                  font-size: 14px;
                  margin-top: 20px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">OhWP Studios</div>
                  <h1>Welcome to Your Client Portal!</h1>
                </div>

                <p>Hi ${data.contact_name},</p>

                <p>Your client portal account has been created! You can now access your project dashboard, communicate with our team, and track your project progress in real-time.</p>

                <div class="credentials-box">
                  <h3 style="margin-top: 0; color: #1f2937;">Your Login Credentials</h3>
                  <div class="credential-row">
                    <span class="credential-label">Portal URL:</span>
                    <span class="credential-value">https://ohwpstudios.org/client/login</span>
                  </div>
                  <div class="credential-row">
                    <span class="credential-label">Email:</span>
                    <span class="credential-value">${data.email.toLowerCase()}</span>
                  </div>
                  <div class="credential-row">
                    <span class="credential-label">Password:</span>
                    <span class="credential-value">${data.password}</span>
                  </div>
                </div>

                <div class="warning">
                  <strong>⚠️ Important Security Notice:</strong><br>
                  For your security, please change your password after your first login. You can do this from your account settings.
                </div>

                <center>
                  <a href="https://ohwpstudios.org/client/login" class="btn">Access Your Portal →</a>
                </center>

                <p class="help-text">
                  <strong>What you can do in the portal:</strong><br>
                  • View real-time project progress and updates<br>
                  • Communicate directly with your project manager<br>
                  • Review and download project files<br>
                  • Track project milestones and deliverables
                </p>

                <div class="footer">
                  <p>If you have any questions or need assistance, please contact your project manager or reply to this email.</p>
                  <p><strong>OhWP Studios</strong><br>
                  Building exceptional digital experiences</p>
                </div>
              </div>
            </body>
            </html>
          `
        });

        console.log(`✅ Welcome email sent to ${data.email}`);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the user creation if email fails - just log the error
      }
    } else {
      console.warn('RESEND_API_KEY not configured - welcome email not sent');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Client user created successfully',
        userId: result.meta.last_row_id
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating client user:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to create client user' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// PUT - Update client user
export const PUT: APIRoute = async ({ request, locals }) => {
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
    const session = await db
      .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(token)
      .first();

    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();

    if (!data.id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Client user ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If password is provided, hash it and update; otherwise, don't change password
    if (data.password) {
      const passwordHash = await hashPassword(data.password);

      const result = await db
        .prepare(`
          UPDATE client_users SET
            email = ?,
            password_hash = ?,
            company_name = ?,
            contact_name = ?,
            phone = ?,
            status = ?,
            updated_at = datetime('now')
          WHERE id = ?
        `)
        .bind(
          data.email.toLowerCase(),
          passwordHash,
          data.company_name,
          data.contact_name,
          data.phone || null,
          data.status || 'active',
          data.id
        )
        .run();

      if (!result.success) {
        throw new Error('Failed to update client user');
      }
    } else {
      // Update without changing password
      const result = await db
        .prepare(`
          UPDATE client_users SET
            email = ?,
            company_name = ?,
            contact_name = ?,
            phone = ?,
            status = ?,
            updated_at = datetime('now')
          WHERE id = ?
        `)
        .bind(
          data.email.toLowerCase(),
          data.company_name,
          data.contact_name,
          data.phone || null,
          data.status || 'active',
          data.id
        )
        .run();

      if (!result.success) {
        throw new Error('Failed to update client user');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Client user updated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error updating client user:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update client user' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// DELETE - Delete client user
export const DELETE: APIRoute = async ({ request, locals }) => {
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
    const session = await db
      .prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(token)
      .first();

    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Client user ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Delete client user
    const result = await db
      .prepare('DELETE FROM client_users WHERE id = ?')
      .bind(id)
      .run();

    if (!result.success) {
      throw new Error('Failed to delete client user');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Client user deleted successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error deleting client user:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to delete client user' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
