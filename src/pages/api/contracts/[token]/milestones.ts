import type { APIRoute } from 'astro';

export const prerender = false;

// GET: Fetch milestones for a contract by unguessable share token (token-gated).
// A purely-numeric or unknown token → 404 (no numeric-id enumeration/oracle).
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

    // Resolve token → contract id
    const contract = await db
      .prepare('SELECT id FROM contracts WHERE share_token = ?')
      .bind(token)
      .first<{ id: number }>();

    if (!contract) {
      return new Response(JSON.stringify({ error: 'Contract not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch milestones by the resolved numeric id
    const result = await db
      .prepare('SELECT * FROM contract_milestones WHERE contract_id = ? ORDER BY created_at ASC')
      .bind(contract.id)
      .all();

    return new Response(JSON.stringify(result.results || []), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
