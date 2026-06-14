import type { APIRoute } from 'astro';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '../../../utils/rate-limit';
import { sendEmail, emailShell, emailButton, escapeHtml, ADMIN_EMAIL } from '../../../lib/email';
import { recommendSolution, type QuizAnswers } from '../../../lib/quiz-recommendation';

export const prerender = false;

const ANSWER_LABELS: Record<string, string> = {
  goal: 'Primary goal',
  platform: 'Solution type',
  audience: 'Target audience',
  timeline: 'Timeline',
  features: 'Top priority feature',
  budget: 'Budget range',
  involvement: 'Involvement style',
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Rate limit (in-memory per isolate; friendly 429 on burst)
    const rl = await checkRateLimit('quiz-submit:' + getClientIdentifier(request), RATE_LIMITS.QUIZ);
    if (!rl.allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many submissions, please try again shortly.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const data = await request.json();
    const name = (data.name || '').toString().slice(0, 120).trim();
    const email = (data.email || '').toString().slice(0, 200).trim();
    const company = data.company ? data.company.toString().slice(0, 200).trim() : null;
    const answers: QuizAnswers = data.answers && typeof data.answers === 'object' ? data.answers : {};

    if (!name || !email || !data.answers) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!email.includes('@') || email.length < 3) {
      return new Response(JSON.stringify({ error: 'Please enter a valid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const db = locals.runtime?.env?.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not available' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // CRITICAL PATH: persist the lead. A failure here returns 500 so the widget
    // retries — we never silently drop a lead.
    await db
      .prepare(
        `INSERT INTO quiz_leads
          (name, email, company, goal, platform, audience, timeline, features, budget, involvement, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .bind(
        name,
        email,
        company,
        answers.goal || null,
        answers.platform || null,
        answers.audience || null,
        answers.timeline || null,
        answers.features || null,
        answers.budget || null,
        answers.involvement || null
      )
      .run();

    const recommendation = recommendSolution(answers);

    // BEST-EFFORT: emails must never fail the submit after the lead is saved.
    try {
      const env = locals.runtime?.env || {};

      const answerRows = Object.entries(ANSWER_LABELS)
        .map(([k, label]) => {
          const v = (answers as Record<string, string | undefined>)[k];
          return v ? `<tr><td style="padding:4px 12px 4px 0;color:#8a7a63;">${escapeHtml(label)}</td><td style="padding:4px 0;"><strong>${escapeHtml(v)}</strong></td></tr>` : '';
        })
        .join('');

      // Admin alert
      await sendEmail(env, {
        to: ADMIN_EMAIL,
        subject: `New quiz lead: ${name}`,
        replyTo: email,
        html: emailShell(
          'New Quiz Lead',
          `<p style="margin:0 0 12px;">A new Project Discovery Quiz was completed.</p>
           <p style="margin:0 0 16px;"><strong>${escapeHtml(name)}</strong>${company ? ' · ' + escapeHtml(company) : ''}<br>
           <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
           <p style="margin:0 0 6px;color:#8a7a63;">Recommended: <strong>${escapeHtml(recommendation.title)}</strong></p>
           <table style="border-collapse:collapse;font-size:14px;margin-top:8px;">${answerRows}</table>`
        ),
      });

      // Visitor thank-you with the personalized recommendation
      await sendEmail(env, {
        to: email,
        subject: 'Your OhWP Studios recommendation',
        replyTo: ADMIN_EMAIL,
        html: emailShell(
          'Your Personalized Recommendation',
          `<p style="margin:0 0 12px;">Hi ${escapeHtml(name)}, thanks for completing our Project Discovery Quiz!</p>
           <p style="margin:0 0 6px;color:#8a7a63;">Based on your answers, we recommend:</p>
           <h2 style="margin:0 0 8px;font-size:20px;">${escapeHtml(recommendation.title)}</h2>
           <p style="margin:0 0 20px;">${escapeHtml(recommendation.description)}</p>
           ${emailButton('https://ohwpstudios.org/booking', 'Book a free consultation')}
           <p style="margin:20px 0 0;font-size:13px;color:#8a7a63;">Prefer email? Just reply to this message — we read every one.</p>`
        ),
      });
    } catch (e) {
      console.error('quiz email failed (non-fatal):', e);
    }

    return new Response(JSON.stringify({ success: true, recommendation }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
