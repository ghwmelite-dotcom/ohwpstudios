import type { APIRoute } from 'astro';
import { EDITORIAL_POSTS } from '@/content/editorial-pack';
export const prerender=false;
// Existing /api/admin/* middleware applies both session authentication and CSRF.
export const POST:APIRoute=async({locals})=>{
  const db=locals.runtime?.env?.DB as D1Database|undefined;
  if(!db)return Response.json({error:'Blog storage unavailable'},{status:503});
  const results=await db.batch(EDITORIAL_POSTS.map(post=>db.prepare(`INSERT INTO blog_posts(title,slug,excerpt,content,featured_image,author,published,seo_title,seo_description,tags) VALUES (?,?,?,?,?,'Hodges & Co. Studios',0,?,?,?) ON CONFLICT(slug) DO NOTHING`).bind(post.title,post.slug,post.excerpt,post.content,post.featured_image,post.seo_title,post.seo_description,post.tags)));
  return Response.json({success:true,added:results.reduce((sum,result)=>sum+(result.meta.changes??0),0),total:EDITORIAL_POSTS.length},{headers:{'Cache-Control':'no-store'}});
};
