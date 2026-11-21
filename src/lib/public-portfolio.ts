/** Published portfolio reads do not call or weaken the authenticated admin API. */
export interface PublicProject {
  id: number; title: string; slug: string; subtitle: string | null;
  description: string | null; featured_image: string | null;
  category_id: number | null; category_name: string | null; project_url: string | null;
  challenge: string | null; solution: string | null; results: string | null; is_featured: number;
}
export interface PublicCategory { id: number; name: string; slug: string }
const PUBLIC_COLUMNS = `p.id, p.title, p.slug, p.subtitle, p.description,
  p.featured_image, p.category_id, c.name AS category_name, p.project_url,
  p.challenge, p.solution, p.results, p.is_featured`;
// Demo records from migration 013 must never be presented as delivered work.
const DEMO_SLUGS = ['finpay-digital-banking', 'cloudops-enterprise-saas',
  'luxestyle-fashion-marketplace', 'healthconnect-patient-portal',
  'propsphere-real-estate', 'velocity-dynamics-rebrand',
  'flavorfusion-restaurant-platform', 'eduquest-learning-platform'];
const PUBLISHED = `p.is_published = 1 AND p.slug NOT IN (${DEMO_SLUGS.map(() => '?').join(',')})`;

export async function getPublicProjects(db: D1Database, limit = 60): Promise<PublicProject[]> {
  const count = Math.min(60, Math.max(1, Math.trunc(limit) || 60));
  const rows = await db.prepare(`SELECT ${PUBLIC_COLUMNS}
    FROM portfolio_projects p LEFT JOIN portfolio_categories c ON c.id = p.category_id
    WHERE ${PUBLISHED} ORDER BY p.display_order ASC, p.created_at DESC LIMIT ?`)
    .bind(...DEMO_SLUGS, count).all<PublicProject>();
  return rows.results ?? [];
}
export async function getPublicProject(db: D1Database, slug: string): Promise<PublicProject | null> {
  return db.prepare(`SELECT ${PUBLIC_COLUMNS}
    FROM portfolio_projects p LEFT JOIN portfolio_categories c ON c.id = p.category_id
    WHERE ${PUBLISHED} AND p.slug = ? LIMIT 1`).bind(...DEMO_SLUGS, slug).first<PublicProject>();
}
export async function getPublicCategories(db: D1Database): Promise<PublicCategory[]> {
  const rows = await db.prepare(`SELECT c.id, c.name, c.slug FROM portfolio_categories c
    WHERE EXISTS (SELECT 1 FROM portfolio_projects p WHERE p.category_id = c.id AND ${PUBLISHED})
    ORDER BY c.display_order ASC, c.name ASC`).bind(...DEMO_SLUGS).all<PublicCategory>();
  return rows.results ?? [];
}
export function publicUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('/') && !value.startsWith('//') && !/[\\\s]/.test(value)) return value;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : undefined; }
  catch { return undefined; }
}
