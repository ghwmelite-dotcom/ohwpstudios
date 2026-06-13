import type { APIRoute } from 'astro';

export const prerender = false;

// GET: Fetch contract details by unguessable share token (token-gated, no
// numeric-id enumeration). A purely-numeric or unknown token → 404 (no oracle).
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const { token } = params;

    if (!token || /^\d+$/.test(token)) {
      return new Response(JSON.stringify({ error: 'Contract not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = locals.runtime?.env?.DB;

    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch contract by share token
    const contract = await db
      .prepare('SELECT * FROM contracts WHERE share_token = ?')
      .bind(token)
      .first();

    if (!contract) {
      return new Response(JSON.stringify({ error: 'Contract not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return public fields only
    const publicContract = {
      id: contract.id,
      contract_number: contract.contract_number,
      title: contract.title,
      description: contract.description,
      client_name: contract.client_name,
      client_email: contract.client_email,
      total_amount: contract.total_amount,
      currency: contract.currency,
      status: contract.status,
      created_at: contract.created_at
    };

    return new Response(JSON.stringify(publicContract), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching contract:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
