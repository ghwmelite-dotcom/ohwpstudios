import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const formData = await request.formData();

    // Extract form fields
    const full_name = formData.get('full_name') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string || null;
    const company = formData.get('company') as string || null;
    const service_type = formData.get('service_type') as string;
    const budget_range = formData.get('budget_range') as string || null;
    const project_timeline = formData.get('project_timeline') as string || null;
    const project_description = formData.get('project_description') as string;
    const how_found = formData.get('how_found') as string || null;

    // Analytics data
    const session_id = formData.get('session_id') as string;
    const time_spent = parseInt(formData.get('time_spent') as string || '0');
    const field_interactions = formData.get('field_interactions') as string;
    const user_agent = formData.get('user_agent') as string;
    const referrer = formData.get('referrer') as string || null;
    const utm_source = formData.get('utm_source') as string || null;
    const utm_medium = formData.get('utm_medium') as string || null;
    const utm_campaign = formData.get('utm_campaign') as string || null;

    // Validation
    if (!full_name || !email || !service_type || !project_description) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
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

    const db = locals.runtime?.env?.DB;

    if (!db) {
      console.error('Database not available');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database not available'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle file uploads (placeholder - will implement in next step)
    const files = formData.getAll('files[]');
    let attachments = null;
    if (files.length > 0) {
      // For now, we'll store file names
      // In production, upload to R2 or similar storage
      const fileNames = files.map((file: any) => file.name);
      attachments = JSON.stringify(fileNames);
    }

    // Insert contact submission
    const submissionResult = await db.prepare(`
      INSERT INTO contact_submissions (
        full_name,
        email,
        phone,
        company,
        service_type,
        budget_range,
        project_timeline,
        project_description,
        how_found,
        attachments,
        status,
        priority,
        form_version,
        user_agent,
        referrer,
        utm_source,
        utm_medium,
        utm_campaign
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      full_name,
      email,
      phone,
      company,
      service_type,
      budget_range,
      project_timeline,
      project_description,
      how_found,
      attachments,
      'new',
      'medium',
      'v1',
      user_agent,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign
    ).run();

    const submission_id = submissionResult.meta.last_row_id;

    // Insert form analytics
    await db.prepare(`
      INSERT INTO form_analytics (
        session_id,
        form_type,
        step_reached,
        total_steps,
        completed,
        time_spent_seconds,
        started_at,
        completed_at,
        user_agent,
        referrer,
        field_interactions,
        utm_source,
        utm_medium,
        utm_campaign
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' seconds'), datetime('now'), ?, ?, ?, ?, ?, ?)
    `).bind(
      session_id,
      'contact',
      4,
      4,
      1,
      time_spent,
      time_spent,
      user_agent,
      referrer,
      field_interactions,
      utm_source,
      utm_medium,
      utm_campaign
    ).run();

    // Get auto-responder template
    const templateResult = await db.prepare(`
      SELECT * FROM email_templates
      WHERE template_name = 'contact_auto_reply' AND active = 1
      LIMIT 1
    `).first();

    // Initialize Resend with API key
    const resendApiKey = locals.runtime?.env?.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured');
    }

    if (templateResult && resendApiKey) {
      const resend = new Resend(resendApiKey);

      try {
        // Send auto-responder email to customer
        await resend.emails.send({
          from: 'OhWP Studios <noreply@ohwpstudios.org>',
          to: [email],
          subject: replaceVariables(templateResult.subject as string, {
            name: full_name,
            email,
            service_type,
            company_name: 'OhWP Studios',
            website_url: 'https://ohwpstudios.org'
          }),
          html: replaceVariables(templateResult.body_html as string, {
            name: full_name,
            email,
            service_type,
            company_name: 'OhWP Studios',
            website_url: 'https://ohwpstudios.org'
          }),
          text: replaceVariables(templateResult.body_text as string, {
            name: full_name,
            email,
            service_type,
            company_name: 'OhWP Studios',
            website_url: 'https://ohwpstudios.org'
          })
        });
        console.log('✅ Auto-responder email sent to:', email);
      } catch (emailError) {
        console.error('Failed to send auto-responder email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Get internal notification template
    const notificationResult = await db.prepare(`
      SELECT * FROM email_templates
      WHERE template_name = 'new_contact_notification' AND active = 1
      LIMIT 1
    `).first();

    if (notificationResult && resendApiKey) {
      const resend = new Resend(resendApiKey);

      try {
        // Send internal notification email to team
        await resend.emails.send({
          from: 'OhWP Studios <noreply@ohwpstudios.org>',
          to: ['ohwpstudios@gmail.com'],
          subject: replaceVariables(notificationResult.subject as string, {
            name: full_name,
            email,
            phone: phone || 'N/A',
            company: company || 'N/A',
            service_type,
            budget_range: budget_range || 'Not specified',
            project_timeline: project_timeline || 'Not specified',
            project_description,
            admin_url: 'https://ohwpstudios.org/admin/contacts'
          }),
          html: replaceVariables(notificationResult.body_html as string, {
            name: full_name,
            email,
            phone: phone || 'N/A',
            company: company || 'N/A',
            service_type,
            budget_range: budget_range || 'Not specified',
            project_timeline: project_timeline || 'Not specified',
            project_description,
            admin_url: 'https://ohwpstudios.org/admin/contacts'
          }),
          text: replaceVariables(notificationResult.body_text as string, {
            name: full_name,
            email,
            phone: phone || 'N/A',
            company: company || 'N/A',
            service_type,
            budget_range: budget_range || 'Not specified',
            project_timeline: project_timeline || 'Not specified',
            project_description,
            admin_url: 'https://ohwpstudios.org/admin/contacts'
          })
        });
        console.log('✅ Internal notification email sent to: ohwpstudios@gmail.com');
      } catch (emailError) {
        console.error('Failed to send internal notification email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Your inquiry has been submitted successfully',
        submission_id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Contact form submission error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'An error occurred while processing your request'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};

// Helper function to replace template variables
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, variables[key]);
  });
  return result;
}
