import type {APIRoute} from 'astro';
import type {D1Database} from '@cloudflare/workers-types';
import {nextPortfolioSync,PORTFOLIO_OWNER,PORTFOLIO_SYNC_LIMIT,syncWeeklyPortfolio} from '../../../lib/portfolio-sync';
export const prerender=false;
const json=(body:object,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
// The existing central admin session guard and CSRF check apply to this route.
export const GET:APIRoute=async({locals})=>{
 const db=(locals as {runtime?:{env?:{DB?:D1Database}}}).runtime?.env?.DB;if(!db)return json({error:'Portfolio storage unavailable'},503);
 try{const settings=await db.prepare('SELECT enabled FROM portfolio_sync_settings WHERE id=1').first<{enabled:number}>();const runs=await db.prepare('SELECT week_key,status,attempt_count,started_at,finished_at,discovered,added,preserved,deferred,error_code FROM portfolio_sync_runs ORDER BY week_key DESC LIMIT 8').all();return json({enabled:settings?.enabled===1,owner:PORTFOLIO_OWNER,schedule:'Mondays at 10:00 Africa/Accra (UTC)',next_run:nextPortfolioSync(),limit:PORTFOLIO_SYNC_LIMIT,runs:runs.results??[]});}catch{return json({error:'Weekly repository sync is unavailable. Check its database migration.'},503);}
};
export const POST:APIRoute=async({request,locals})=>{
 let body:unknown;try{body=await request.json();}catch{return json({error:'Invalid JSON'},400);}
 if(!body||typeof body!=='object'||!('action'in body)||!['pause','resume','sync'].includes(String(body.action)))return json({error:'Choose pause, resume or sync'},400);
 const db=(locals as {runtime?:{env?:{DB?:D1Database}}}).runtime?.env?.DB;if(!db)return json({error:'Portfolio storage unavailable'},503);
 try{if(body.action==='pause'||body.action==='resume'){await db.prepare("UPDATE portfolio_sync_settings SET enabled=?,updated_at=datetime('now') WHERE id=1").bind(body.action==='resume'?1:0).run();return json({success:true,enabled:body.action==='resume'});}
 const result=await syncWeeklyPortfolio(db,new Date(),{retry:true});return json(result,result.status==='failed'?422:200);
 }catch{return json({error:'Repository sync could not finish. Existing projects were preserved; check the run history.'},503);}
};
