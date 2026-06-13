import type { APIRoute } from 'astro';
import { generateShareToken } from '../../../../lib/contract-verify';
import { sendEmail, emailShell, emailButton, escapeHtml } from '../../../../lib/email';

export const prerender = false;

// POST: Send contract to client
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
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

    // Ensure a share token exists (older contracts may predate token-at-creation)
    let token = contract.share_token as string | null;
    if (!token) {
      token = generateShareToken();
      await db.prepare('UPDATE contracts SET share_token = ? WHERE id = ?').bind(token, contract_id).run();
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
      .bind(contract_id, 'admin', JSON.stringify({ message }))
      .run();

    // Build the secure signing URL from the share token
    const siteUrl = (locals.runtime?.env?.SITE_URL as string) || 'https://ohwpstudios.org';
    const contractUrl = `${siteUrl}/contract/${token}`;

    // Email the client their secure signing link (non-fatal if it fails)
    try {
      await sendEmail(locals.runtime?.env ?? {}, {
        to: String(contract.client_email),
        subject: `Your contract from OhWP Studios — ${contract.title}`,
        html: emailShell(
          'Your contract is ready',
          `<p>Hi ${escapeHtml(String(contract.client_name).split(/\s+/)[0] || 'there')},</p>
           <p>${escapeHtml(message || 'Your contract is ready to review and sign.')}</p>
           <p>Contract <strong>${escapeHtml(String(contract.contract_number))}</strong>. When you click below you'll be asked for a quick verification code we email you, then you can sign.</p>
           ${emailButton(contractUrl, 'Review & sign your contract')}`,
        ),
      });
    } catch (e) {
      console.error('contract send email failed:', e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        contract_url: contractUrl,
        message: 'Contract sent'
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
