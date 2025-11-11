import type { APIRoute } from 'astro';

export const prerender = false;

// POST: Send contract to client
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify admin token
    const adminSession = await db
      .prepare('SELECT * FROM admin_sessions WHERE token = ? AND expires_at > datetime("now")')
      .bind(token)
      .first();

    if (!adminSession) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await request.json();
    const { contract_id, message } = data;

    if (!contract_id) {
      return new Response(JSON.stringify({ error: 'Contract ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch contract
    const contract = await db
      .prepare('SELECT * FROM contracts WHERE id = ?')
      .bind(contract_id)
      .first();

    if (!contract) {
      return new Response(JSON.stringify({ error: 'Contract not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (contract.status === 'signed' || contract.status === 'completed') {
      return new Response(JSON.stringify({ error: 'Cannot send a signed contract' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update contract status to 'sent'
    await db
      .prepare(`
        UPDATE contracts
        SET status = 'sent',
            sent_at = datetime('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `)
      .bind(contract_id)
      .run();

    // Create history entry
    await db
      .prepare(`
        INSERT INTO contract_history (
          contract_id,
          action,
          performed_by,
          changes,
          created_at
        ) VALUES (?, 'sent', ?, ?, datetime('now'))
      `)
      .bind(contract_id, adminSession.username, JSON.stringify({ message }))
      .run();

    // Generate contract signing URL
    const siteUrl = locals.runtime.env.SITE_URL || 'https://ohwpstudios.org';
    const contractUrl = `${siteUrl}/contract/${contract_id}`;

    // TODO: Send email to client with contract link
    // For now, we'll just return the URL
    // In production, integrate with Resend or similar email service:
    /*
    const resendApiKey = locals.runtime.env.RESEND_API_KEY;
    if (resendApiKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'contracts@ohwpstudios.org',
          to: contract.client_email,
          subject: `Contract Ready for Review: ${contract.title}`,
          html: `
            <h1>Your Contract is Ready</h1>
            <p>Dear ${contract.client_name},</p>
            <p>${message || 'Please review and sign the contract using the link below:'}</p>
            <p><a href="${contractUrl}">View and Sign Contract</a></p>
            <p>Contract Number: ${contract.contract_number}</p>
            <p>Best regards,<br>OHWP Studios Team</p>
          `
        })
      });
    }
    */

    return new Response(
      JSON.stringify({
        success: true,
        contract_url: contractUrl,
        message: 'Contract sent successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error sending contract:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
