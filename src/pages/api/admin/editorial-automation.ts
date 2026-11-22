import type { APIRoute } from 'astro';
import { EDITORIAL_MODEL, EDITORIAL_REVIEW, generateWeeklyDraft, nextEditorialRun, type EditorialEnvironment } from '@/lib/editorial-automation';
export const prerender = false;
const json=(body:object,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
// Existing /api/admin middleware requires a session; POST also requires CSRF.
export const GET: APIRoute = async ({locals}) => {
  const db=locals.runtime?.env?.DB;
  if(!db)return json({error:'Editorial storage unavailable'},503);
  try {
    const settings=await db.prepare('SELECT enabled FROM editorial_settings WHERE id=1').first<{enabled:number}>();
    const runs=await db.prepare(`SELECT r.week_key,r.topic_key,r.status,r.attempt_count,r.started_at,r.finished_at,r.post_id,r.source_notes,r.review_notes,r.error_code,r.word_count,r.model,p.title AS post_title,p.published AS post_published FROM editorial_runs r LEFT JOIN blog_posts p ON p.id=r.post_id ORDER BY r.week_key DESC LIMIT 8`).all();
    return json({enabled:settings?.enabled===1,schedule:'Mondays at 09:00 Africa/Accra (UTC)',next_run:nextEditorialRun(),model:EDITORIAL_MODEL,review:EDITORIAL_REVIEW,runs:runs.results??[]});
  } catch { return json({error:'Weekly editorial setup is unavailable. Check its database migration.'},503); }
};
export const POST: APIRoute = async ({request,locals}) => {
  let body:unknown;try{body=await request.json();}catch{return json({error:'Invalid JSON'},400);}
  if(!body||typeof body!=='object'||!('action' in body)||!['pause','resume','generate'].includes(String(body.action)))return json({error:'Choose pause, resume or generate'},400);
  const environment=locals.runtime?.env as EditorialEnvironment|undefined;
  if(!environment?.DB)return json({error:'Editorial storage unavailable'},503);
  try {
    if(body.action==='pause'||body.action==='resume'){
      await environment.DB.prepare("UPDATE editorial_settings SET enabled=?,updated_at=datetime('now') WHERE id=1").bind(body.action==='resume'?1:0).run();
      return json({success:true,enabled:body.action==='resume'});
    }
    if(!environment.AI)return json({error:'Cloudflare Workers AI binding unavailable'},503);
    const result=await generateWeeklyDraft(environment,new Date(),{retry:true});
    return json(result,result.status==='failed'?422:200);
  } catch { return json({error:'Editorial operation failed. Check the run log; existing posts were preserved.'},503); }
};
