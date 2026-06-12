import type { APIRoute } from 'astro';

export const prerender = false;

// Guarded by the admin middleware (Task 3); locals.adminUser is set when this runs.
export const GET: APIRoute = async ({ locals }) => {
  const admin = (locals as { adminUser?: { username: string; csrfToken: string } }).adminUser;
  if (!admin) {
    return new Response(JSON.stringify({ success: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(
    JSON.stringify({ success: true, username: admin.username, csrf_token: admin.csrfToken }),
    {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    }
  );
};
