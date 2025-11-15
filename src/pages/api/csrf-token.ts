// CSRF Token Generation Endpoint
// Returns a CSRF token for the current session

import type { APIRoute } from 'astro';
import { generateCSRFToken } from '@/utils/csrf';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  const db = locals.runtime?.env?.DB;

  if (!db) {
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

  try {
    // Generate a new CSRF token
    const csrfToken = generateCSRFToken();

    // Store in session storage (can be retrieved by session token)
    // For stateless approach, we'll return it and client will send it back
    // The server will validate it matches what's expected for the session

    return new Response(
      JSON.stringify({
        success: true,
        csrfToken: csrfToken
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        }
      }
    );
  } catch (error) {
    console.error('Error generating CSRF token:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to generate CSRF token'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};
