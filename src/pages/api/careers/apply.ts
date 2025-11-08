import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = await request.json();

    // Validate required fields
    const requiredFields = [
      'full_name',
      'email',
      'phone',
      'location',
      'position',
      'experience_level',
      'skills',
      'availability',
      'cover_letter'
    ];

    for (const field of requiredFields) {
      if (!data[field] || data[field].trim() === '') {
        return new Response(
          JSON.stringify({
            success: false,
            error: `${field.replace('_', ' ')} is required`
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid email address'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get database from locals (Cloudflare D1)
    const db = locals.runtime?.env?.DB;

    if (!db) {
      console.error('Database not available');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database connection failed'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Insert job application
    const result = await db.prepare(`
      INSERT INTO job_applications (
        full_name,
        email,
        phone,
        location,
        position,
        experience_level,
        portfolio_url,
        linkedin_url,
        github_url,
        cover_letter,
        resume_url,
        skills,
        availability,
        salary_expectation,
        hear_about_us,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', datetime('now'), datetime('now'))
    `).bind(
      data.full_name,
      data.email,
      data.phone,
      data.location,
      data.position,
      data.experience_level,
      data.portfolio_url || null,
      data.linkedin_url || null,
      data.github_url || null,
      data.cover_letter,
      data.resume_url || null,
      data.skills,
      data.availability,
      data.salary_expectation || null,
      data.hear_about_us || null
    ).run();

    if (!result.success) {
      throw new Error('Failed to insert application');
    }

    // Send admin notification email
    const resendApiKey = locals.runtime?.env?.RESEND_API_KEY;
    if (resendApiKey) {
      await sendAdminNotification(resendApiKey, data);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Application submitted successfully',
        applicationId: result.meta.last_row_id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error submitting job application:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to submit application. Please try again.'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// Send admin notification email
async function sendAdminNotification(apiKey: string, data: any) {
  const resend = new Resend(apiKey);

  try {
    await resend.emails.send({
      from: 'OhWP Studios <noreply@ohwpstudios.org>',
      to: 'ohwpstudios@gmail.com',
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
            .view-btn { display: inline-block; padding: 12px 30px; background: #6366f1; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💼 New Job Application</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px;">${data.position.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
            </div>
            <div class="content">
              <div class="grid">
                <div class="field">
                  <span class="label">Applicant Name</span>
                  <div class="value">${data.full_name}</div>
                </div>
                <div class="field">
                  <span class="label">Experience Level</span>
                  <div class="value">${data.experience_level.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</div>
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
              <div class="field">
                <span class="label">Availability</span>
                <div class="value">${data.availability.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</div>
              </div>
              ${data.salary_expectation ? `
              <div class="field">
                <span class="label">Salary Expectation</span>
                <div class="value">${data.salary_expectation}</div>
              </div>
              ` : ''}
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
              <div class="field" style="margin-top: 20px;">
                <span class="label">Cover Letter</span>
                <div class="value" style="white-space: pre-wrap;">${data.cover_letter}</div>
              </div>
              <div style="text-align: center;">
                <a href="https://ohwpstudios.org/admin/applications" class="view-btn">View in Admin Portal</a>
              </div>
            </div>
            <div class="footer">
              <p>Received on ${new Date().toLocaleString()}</p>
              <p>Login to your admin portal to manage this application</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    console.log('✅ Admin notification sent for new job application:', data.full_name);
  } catch (error) {
    console.error('Error sending admin notification for job application:', error);
    // Don't throw - allow application to continue even if email fails
  }
}
