import type { APIRoute } from 'astro';
import { SITE_CONFIG } from '@/config';
export const prerender=false;
export const GET:APIRoute=async({locals})=>{
  const db=locals.runtime?.env?.DB as D1Database|undefined;
  const rows=db?await db.prepare('SELECT title,slug,excerpt FROM blog_posts WHERE published=1 ORDER BY published_at DESC LIMIT 100').all<{title:string;slug:string;excerpt:string|null}>():{results:[]};
  const text=(value:string)=>value.replace(/[\r\n\[\]<>]/g,' ').trim();
  const content=`# ${SITE_CONFIG.name}\n\n> Independent software, AI and trading technology studio in Accra, Ghana. We build products for clients or guide clients through building them.\n\n## Studio\n- [About](${SITE_CONFIG.url}/about): The studio and its approach.\n- [Services](${SITE_CONFIG.url}/sitemap-pages): Software and integration services.\n- [Project scope](${SITE_CONFIG.url}/estimate-project): Prepare a brief; prices follow human review.\n- [Contact](${SITE_CONFIG.url}/contact): Private Telegram enquiries and contact form.\n\n## Published guides\n${(rows.results??[]).map(row=>`- [${text(row.title)}](${SITE_CONFIG.url}/blog/${encodeURIComponent(row.slug)}): ${text(row.excerpt??'')}`).join('\n')}\n`;
  return new Response(content,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'public, max-age=300'}});
};
