import type { APIRoute } from 'astro';

export const prerender = false;

// GET: Fetch contract for client to view/sign (no authentication required, uses contract token)
export const GET: APIRoute = async ({ locals, url }) => {
  try {
    const contractId = url.searchParams.get('id');
    const token = url.searchParams.get('token');

    if (!contractId) {
      return new Response(JSON.stringify({ error: 'Contract ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = locals.runtime.env.DB;

    // Fetch contract
    const contract = await db
      .prepare('SELECT * FROM contracts WHERE id = ?')
      .bind(contractId)
      .first();

    if (!contract) {
      return new Response(JSON.stringify({ error: 'Contract not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update viewed_at if not already viewed
    if (!contract.viewed_at) {
      await db
        .prepare('UPDATE contracts SET viewed_at = datetime("now"), status = ? WHERE id = ?')
        .bind(contract.status === 'sent' ? 'viewed' : contract.status, contractId)
        .run();

      // Create history entry
      await db
        .prepare(`
          INSERT INTO contract_history (contract_id, action, performed_by, created_at)
          VALUES (?, 'viewed', ?, datetime('now'))
        `)
        .bind(contractId, contract.client_email)
        .run();
    }

    // Return contract data (exclude sensitive fields if needed)
    return new Response(
      JSON.stringify({
        id: contract.id,
        contract_number: contract.contract_number,
        title: contract.title,
        description: contract.description,
        content: contract.content,
        total_amount: contract.total_amount,
        currency: contract.currency,
        payment_terms: contract.payment_terms,
        start_date: contract.start_date,
        end_date: contract.end_date,
        delivery_date: contract.delivery_date,
        status: contract.status,
        client_name: contract.client_name,
        client_company: contract.client_company
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching contract:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST: Submit contract signature
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = await request.json();
    const { contract_id, signature_data, signer_name, signer_email } = data;

    if (!contract_id || !signature_data || !signer_name || !signer_email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = locals.runtime.env.DB;

    // Verify contract exists and is not already signed
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
      return new Response(JSON.stringify({ error: 'Contract is already signed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get client IP and user agent
    const clientIP = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Update contract with signature
    await db
      .prepare(`
        UPDATE contracts
        SET signature_data = ?,
            signed_at = datetime('now'),
            signed_ip = ?,
            signed_user_agent = ?,
            status = 'signed',
            updated_at = datetime('now')
        WHERE id = ?
      `)
      .bind(signature_data, clientIP, userAgent, contract_id)
      .run();

    // Create signature record
    await db
      .prepare(`
        INSERT INTO contract_signatures (
          contract_id,
          signer_name,
          signer_email,
          signer_role,
          signature_data,
          signed_at,
          ip_address,
          user_agent
        ) VALUES (?, ?, ?, 'client', ?, datetime('now'), ?, ?)
      `)
      .bind(contract_id, signer_name, signer_email, signature_data, clientIP, userAgent)
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
        ) VALUES (?, 'signed', ?, ?, datetime('now'))
      `)
      .bind(contract_id, signer_email, JSON.stringify({ ip: clientIP }))
      .run();

    // TODO: Send notification email to admin about signed contract
    // TODO: Send confirmation email to client with copy of signed contract

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Contract signed successfully',
        contract_number: contract.contract_number
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error signing contract:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
