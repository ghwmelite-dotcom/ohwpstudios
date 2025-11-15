import type { APIRoute } from 'astro';
import { rateLimitMiddleware, getClientIdentifier, RATE_LIMITS } from '@/utils/rate-limit';

export const prerender = false;

// POST: Handle Paystack webhooks
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Apply rate limiting to prevent webhook spam/abuse
    const clientIP = getClientIdentifier(request);
    const rateLimitResponse = await rateLimitMiddleware(clientIP, RATE_LIMITS.PAYMENT);
    if (rateLimitResponse) {
      return rateLimitResponse; // Rate limit exceeded
    }

    const PAYSTACK_SECRET_KEY = locals.runtime?.env?.PAYSTACK_SECRET_KEY;
    const db = locals.runtime?.env?.DB;

    if (!db || !PAYSTACK_SECRET_KEY) {
      return new Response('Service not available', { status: 500 });
    }

    // Verify Paystack signature
    const paystackSignature = request.headers.get('x-paystack-signature');
    const body = await request.text();

    // Compute hash of the request body using the secret key
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(PAYSTACK_SECRET_KEY),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Verify signature
    if (hashHex !== paystackSignature) {
      console.error('Invalid Paystack signature');
      return new Response('Invalid signature', { status: 400 });
    }

    const event = JSON.parse(body);
    console.log('Paystack webhook received:', event.event);

    // Handle different event types
    if (event.event === 'charge.success') {
      const { reference, amount, currency, paid_at, customer } = event.data;
      const metadata = event.data.metadata || {};

      // Find the payment record
      const payment = await db
        .prepare('SELECT * FROM contract_payments WHERE paystack_reference = ?')
        .bind(reference)
        .first();

      if (!payment) {
        console.error('Payment not found for reference:', reference);
        return new Response('Payment not found', { status: 404 });
      }

      // Update payment status
      await db
        .prepare(`
          UPDATE contract_payments
          SET status = 'success',
              paid_at = ?,
              paystack_data = ?,
              updated_at = datetime('now')
          WHERE paystack_reference = ?
        `)
        .bind(paid_at, JSON.stringify(event.data), reference)
        .run();

      // Update milestone status
      await db
        .prepare(`
          UPDATE contract_milestones
          SET status = 'paid',
              paid_at = ?,
              paystack_reference = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `)
        .bind(paid_at, reference, payment.milestone_id)
        .run();

      // Add to payment history
      await db
        .prepare(`
          INSERT INTO payment_history (payment_id, event_type, event_data)
          VALUES (?, 'success', ?)
        `)
        .bind(payment.id, JSON.stringify(event.data))
        .run();

      // Check if all milestones are paid
      const unpaidMilestones = await db
        .prepare(`
          SELECT COUNT(*) as count
          FROM contract_milestones
          WHERE contract_id = ? AND status != 'paid'
        `)
        .bind(payment.contract_id)
        .first();

      // If all milestones paid, update contract status
      if (unpaidMilestones && unpaidMilestones.count === 0) {
        await db
          .prepare(`
            UPDATE contracts
            SET status = 'completed',
                updated_at = datetime('now')
            WHERE id = ?
          `)
          .bind(payment.contract_id)
          .run();

        // Create contract history entry
        await db
          .prepare(`
            INSERT INTO contract_history (
              contract_id, action, performed_by, changes, created_at
            ) VALUES (?, 'completed', ?, ?, datetime('now'))
          `)
          .bind(
            payment.contract_id,
            customer.email,
            JSON.stringify({ reason: 'All milestones paid' })
          )
          .run();
      }

      console.log('Payment successful:', reference);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
