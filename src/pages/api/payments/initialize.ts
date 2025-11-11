import type { APIRoute } from 'astro';

export const prerender = false;

// POST: Initialize Paystack payment for a milestone
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = await request.json();
    const { milestone_id } = data;

    if (!milestone_id) {
      return new Response(JSON.stringify({ error: 'Milestone ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = locals.runtime?.env?.DB;
    const PAYSTACK_SECRET_KEY = locals.runtime?.env?.PAYSTACK_SECRET_KEY;

    if (!db || !PAYSTACK_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'Service not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Fetch milestone and contract details
    const milestone = await db
      .prepare(`
        SELECT cm.*, c.contract_number, c.client_name, c.client_email, c.currency
        FROM contract_milestones cm
        JOIN contracts c ON cm.contract_id = c.id
        WHERE cm.id = ?
      `)
      .bind(milestone_id)
      .first();

    if (!milestone) {
      return new Response(JSON.stringify({ error: 'Milestone not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (milestone.status === 'paid') {
      return new Response(JSON.stringify({ error: 'Milestone already paid' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate unique payment reference
    const reference = `MLS-${milestone.contract_number}-${milestone.id}-${Date.now()}`;

    // Initialize Paystack payment
    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: milestone.client_email,
        amount: Math.round(milestone.amount * 100), // Convert to kobo/pesewas
        currency: milestone.currency || 'GHS',
        reference: reference,
        callback_url: `${locals.runtime?.env?.SITE_URL}/contract/${milestone.contract_id}/payment-success`,
        metadata: {
          contract_id: milestone.contract_id,
          milestone_id: milestone.id,
          contract_number: milestone.contract_number,
          client_name: milestone.client_name,
          milestone_title: milestone.title
        }
      })
    });

    const paystackData = await paystackResponse.json();

    if (!paystackData.status) {
      console.error('Paystack initialization failed:', paystackData);
      return new Response(JSON.stringify({ error: 'Payment initialization failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Store payment record
    await db
      .prepare(`
        INSERT INTO contract_payments (
          contract_id, milestone_id, amount, currency, paystack_reference,
          customer_email, customer_name, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
      `)
      .bind(
        milestone.contract_id,
        milestone.id,
        milestone.amount,
        milestone.currency || 'GHS',
        reference,
        milestone.client_email,
        milestone.client_name
      )
      .run();

    // Store in payment history
    const paymentResult = await db
      .prepare('SELECT id FROM contract_payments WHERE paystack_reference = ?')
      .bind(reference)
      .first();

    if (paymentResult) {
      await db
        .prepare(`
          INSERT INTO payment_history (payment_id, event_type, event_data)
          VALUES (?, 'initialized', ?)
        `)
        .bind(paymentResult.id, JSON.stringify(paystackData.data))
        .run();
    }

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: paystackData.data.authorization_url,
        access_code: paystackData.data.access_code,
        reference: reference
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error initializing payment:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
