import type { APIRoute } from 'astro';
import { parseBlogInput } from '@/lib/blog-editor';
export const prerender=false;
// Authentication and CSRF are enforced by the existing admin middleware.
const json=(body:object,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export const GET:APIRoute=async({locals})=>{
 const db=locals.runtime?.env?.DB as D1Database|undefined;
 if(!db)return json({error:'Blog storage unavailable'},503);
 const posts=await db.prepare('SELECT * FROM blog_posts ORDER BY COALESCE(published_at,created_at) DESC,id DESC').all();
 return json({success:true,posts:posts.results??[]});
};
const save=(update:boolean):APIRoute=>async({request,locals})=>{
 let raw:unknown;try{raw=await request.json();}catch{return json({error:'Invalid JSON'},400);}
 const post=parseBlogInput(raw);
 const id=raw&&typeof raw==='object'&&'id' in raw?Number(raw.id):0;
 if(!post||(update&&(!Number.isSafeInteger(id)||id<1)))return json({error:'A title, valid URL slug and article content are required'},400);
 const db=locals.runtime?.env?.DB as D1Database|undefined;
 if(!db)return json({error:'Blog storage unavailable'},503);
 if(update&&!await db.prepare('SELECT id FROM blog_posts WHERE id=?').bind(id).first())return json({error:'Article not found'},404);
 const duplicate=await db.prepare('SELECT id FROM blog_posts WHERE slug=? AND id<>?').bind(post.slug,update?id:0).first();
 if(duplicate)return json({error:'That article URL is already in use'},409);
 const values=[post.title,post.slug,post.excerpt,post.content,post.featured_image,post.author,post.published,post.seo_title,post.seo_description,post.tags];
 const result=update
 ?await db.prepare("UPDATE blog_posts SET title=?,slug=?,excerpt=?,content=?,featured_image=?,author=?,published=?,seo_title=?,seo_description=?,tags=?,published_at=CASE WHEN ?=1 THEN COALESCE(published_at,datetime('now')) ELSE published_at END,updated_at=datetime('now') WHERE id=?").bind(...values,post.published,id).run()
 :await db.prepare("INSERT INTO blog_posts(title,slug,excerpt,content,featured_image,author,published,seo_title,seo_description,tags,published_at) VALUES (?,?,?,?,?,?,?,?,?,?,CASE WHEN ?=1 THEN datetime('now') ELSE NULL END)").bind(...values,post.published).run();
 return json({success:true,id:update?id:result.meta.last_row_id},update?200:201);
};
export const POST=save(false);
export const PUT=save(true);
export const DELETE:APIRoute=async({request,locals})=>{
 const id=Number(new URL(request.url).searchParams.get('id'));
 if(!Number.isSafeInteger(id)||id<1)return json({error:'Valid article ID required'},400);
 const db=locals.runtime?.env?.DB as D1Database|undefined;
 if(!db)return json({error:'Blog storage unavailable'},503);
 await db.prepare('DELETE FROM blog_posts WHERE id=?').bind(id).run();
 return json({success:true});
};
