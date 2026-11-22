import type {D1Database} from '@cloudflare/workers-types';
import {repositoryCoverUrl} from './repository-covers';

export const PORTFOLIO_OWNER='ghwmelite-dotcom';
export const PORTFOLIO_SYNC_CRON='0 10 * * MON';
export const PORTFOLIO_SYNC_LIMIT=20;
const MAX_PAGES=10;
const MAX_RESPONSE_BYTES=2_000_000;
interface Repository {id:number;name:string;full_name:string;description:string|null;language:string|null}
interface Project {id:number;slug:string;repository_url:string|null;project_url:string|null}
interface Run {status:string;attempt_count:number;lease_token:string}
export interface SyncResult {week:string;status:'complete'|'failed'|'paused'|'busy'|'existing';added?:number;preserved?:number;deferred?:number;code?:string}
class SyncFailure extends Error {constructor(readonly code:string){super(code);}}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
export function portfolioWeek(now:Date):string {
 const day=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
 day.setUTCDate(day.getUTCDate()-((day.getUTCDay()+6)%7));return day.toISOString().slice(0,10);
}
export function nextPortfolioSync(now=new Date()):string {
 const next=new Date(now);next.setUTCHours(10,0,0,0);next.setUTCDate(next.getUTCDate()+((8-next.getUTCDay())%7));
 if(next<=now)next.setUTCDate(next.getUTCDate()+7);return next.toISOString();
}
export function canonicalRepository(value:string|null):string|null {
 if(!value)return null;
 try{const u=new URL(value);if(u.protocol!=='https:'||u.hostname!=='github.com'||u.username||u.password||u.search||u.hash)return null;const path=u.pathname.replace(/\/$/,'').replace(/\.git$/i,'');if(!/^\/[^/]+\/[^/]+$/.test(path))return null;return `https://github.com${path}`.toLowerCase();}catch{return null;}
}
function repo(value:unknown):Repository|null {
 if(!object(value)||value.private!==false||value.visibility!=='public'||value.fork!==false||value.archived!==false||value.disabled!==false||!Number.isSafeInteger(value.id)||Number(value.id)<1||!object(value.owner)||String(value.owner.login).toLowerCase()!==PORTFOLIO_OWNER||typeof value.name!=='string'||!/^[A-Za-z0-9_.-]{1,100}$/.test(value.name)||String(value.full_name).toLowerCase()!==`${PORTFOLIO_OWNER}/${value.name}`.toLowerCase()||typeof value.size!=='number'||value.size<=0)return null;
 return {id:Number(value.id),name:value.name,full_name:String(value.full_name),description:typeof value.description==='string'?value.description:null,language:typeof value.language==='string'?value.language:null};
}
async function github(path:string,fetcher:typeof fetch,allowMissing=false):Promise<unknown> {
 let response:Response;
 try{response=await fetcher(`https://api.github.com${path}`,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{Accept:'application/vnd.github+json','User-Agent':'HodgesStudioPortfolioSync/1.0'}});}catch{throw new SyncFailure('github_unavailable');}
 if(allowMissing&&response.status===404)return null;
 if(!response.ok)throw new SyncFailure(response.status===403||response.status===429?'github_rate_limited':'github_fetch_failed');
 if(!/application\/(?:[^;]+\+)?json/i.test(response.headers.get('content-type')||'')||!response.body)throw new SyncFailure('github_response_invalid');
 const reader=response.body.getReader();let text='',bytes=0;const decoder=new TextDecoder();
 try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>MAX_RESPONSE_BYTES)throw new SyncFailure('github_response_too_large');text+=decoder.decode(part.value,{stream:true});}text+=decoder.decode();}finally{await reader.cancel();}
 try{return JSON.parse(text) as unknown;}catch{throw new SyncFailure('github_response_invalid');}
}
export async function discoverPublicRepositories(fetcher:typeof fetch=fetch):Promise<Repository[]> {
 const repositories=new Map<number,Repository>();
 for(let page=1;page<=MAX_PAGES;page++){
  const data=await github(`/users/${PORTFOLIO_OWNER}/repos?type=owner&sort=full_name&direction=asc&per_page=100&page=${page}`,fetcher);
  if(!Array.isArray(data)||data.length>100)throw new SyncFailure('github_response_invalid');
  for(const value of data){if(!object(value)||typeof value.private!=='boolean'||!object(value.owner)||typeof value.name!=='string')throw new SyncFailure('github_response_invalid');const valid=repo(value);if(valid)repositories.set(valid.id,valid);}
  if(data.length<100)return [...repositories.values()];
 }
 throw new SyncFailure('github_pagination_limit');
}
const plain=(value:string,max:number)=>value.replace(/[<>\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
export async function syncWeeklyPortfolio(db:D1Database,now=new Date(),options:{fetcher?:typeof fetch;retry?:boolean}={}):Promise<SyncResult> {
 const week=portfolioWeek(now);const enabled=async()=> (await db.prepare('SELECT enabled FROM portfolio_sync_settings WHERE id=1').first<{enabled:number}>())?.enabled===1;
 if(!await enabled())return {week,status:'paused'};
 const lease=crypto.randomUUID();const started=now.toISOString();const stale=new Date(now.getTime()-20*60*1000).toISOString();
 const claim=await db.prepare(`INSERT INTO portfolio_sync_runs(week_key,status,lease_token,started_at) VALUES(?,'running',?,?) ON CONFLICT(week_key) DO UPDATE SET status='running',attempt_count=attempt_count+1,lease_token=excluded.lease_token,started_at=excluded.started_at,finished_at=NULL,error_code=NULL WHERE ?=1 AND portfolio_sync_runs.attempt_count<2 AND (portfolio_sync_runs.status IN('failed','paused') OR (portfolio_sync_runs.status='running' AND portfolio_sync_runs.started_at<?))`).bind(week,lease,started,options.retry?1:0,stale).run();
 if(!claim.meta.changes){const run=await db.prepare('SELECT status,attempt_count,lease_token FROM portfolio_sync_runs WHERE week_key=?').bind(week).first<Run>();return {week,status:run?.status==='complete'?'existing':'busy'};}
 const gate=`EXISTS(SELECT 1 FROM portfolio_sync_settings s,portfolio_sync_runs r WHERE s.id=1 AND s.enabled=1 AND r.week_key=? AND r.status='running' AND r.lease_token=?)`;
 try{
  const discovered=await discoverPublicRepositories(options.fetcher);
  const existing=(await db.prepare('SELECT id,slug,repository_url,project_url FROM portfolio_projects').all<Project>()).results;
  const ledger=(await db.prepare('SELECT repository_id FROM portfolio_repository_sync').all<{repository_id:number}>()).results;
  const seen=new Set(ledger.map(row=>row.repository_id));
  const urlIndex=new Map<string,number>();for(const project of existing)for(const link of [project.repository_url,project.project_url]){const key=canonicalRepository(link);if(key&&!urlIndex.has(key))urlIndex.set(key,project.id);}
  const matched=discovered.filter(item=>!seen.has(item.id)&&urlIndex.has(`https://github.com/${item.full_name}`.toLowerCase()));
  const pending=discovered.filter(item=>!seen.has(item.id)&&!urlIndex.has(`https://github.com/${item.full_name}`.toLowerCase()));
  // GitHub fetches are bounded; all writes share one atomic D1 batch.
  const candidates=pending.slice(0,PORTFOLIO_SYNC_LIMIT);const verified:Repository[]=[];
  for(let offset=0;offset<candidates.length;offset+=4){const results=await Promise.all(candidates.slice(offset,offset+4).map(async item=>{const data=await github(`/repos/${PORTFOLIO_OWNER}/${encodeURIComponent(item.name)}`,options.fetcher??fetch,true);const current=repo(data);return current&&current.id===item.id&&current.full_name.toLowerCase()===item.full_name.toLowerCase()?current:null;}));verified.push(...results.filter((item):item is Repository=>item!==null));}
  const statements=[];
  if(verified.length)statements.push(db.prepare(`INSERT OR IGNORE INTO portfolio_categories(name,slug,description) SELECT 'Repository projects','repository-projects','Public GitHub projects awaiting studio review' WHERE ${gate}`).bind(week,lease));
  for(const item of matched){const url=`https://github.com/${item.full_name}`;const id=urlIndex.get(url.toLowerCase())!;statements.push(db.prepare(`INSERT OR IGNORE INTO portfolio_repository_sync(repository_id,repository_url,project_id,origin,run_token,discovered_at) SELECT ?,?,(SELECT id FROM portfolio_projects WHERE id=?),'existing',?,? WHERE ${gate}`).bind(item.id,url,id,lease,started,week,lease));}
  for(const item of verified){
   const url=`https://github.com/${item.full_name}`;const slug=`github-${item.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}-${item.id}`;
   const cover=repositoryCoverUrl(item);
   const title=plain(item.name.replace(/[_-]+/g,' '),150);const description=plain(item.description||`A public ${item.language?item.language+' ':''}repository by Hodges & Co. Studios. Review the source and complete this project study before publishing.`,500);
   // Imported metadata cannot supply publication state, results, metrics, links or HTML.
   statements.push(db.prepare(`INSERT INTO portfolio_projects(title,slug,subtitle,description,category_id,featured_image,thumbnail_image,is_published,is_featured,display_order,meta_title,meta_description,repository_url,repository_verified_at) SELECT ?,?,'Repository draft',?,(SELECT id FROM portfolio_categories WHERE slug='repository-projects'),?,?,0,0,1000,?,?,?,? WHERE ${gate} AND NOT EXISTS(SELECT 1 FROM portfolio_repository_sync WHERE repository_id=?) AND NOT EXISTS(SELECT 1 FROM portfolio_projects WHERE lower(rtrim(repository_url,'/'))=lower(?) OR lower(rtrim(project_url,'/'))=lower(?)) ON CONFLICT(slug) DO NOTHING`).bind(title,slug,description,cover,cover,`${title} — Hodges & Co. Studios`,description.slice(0,160),url,started,week,lease,item.id,url,url));
   statements.push(db.prepare(`INSERT OR IGNORE INTO portfolio_repository_sync(repository_id,repository_url,project_id,origin,run_token,discovered_at) SELECT ?,?,p.id,'draft',?,? FROM portfolio_projects p WHERE p.slug=? AND p.repository_url=? AND ${gate}`).bind(item.id,url,lease,started,slug,url,week,lease));
  }
  const deferred=Math.max(0,pending.length-candidates.length);
  statements.push(db.prepare(`UPDATE portfolio_sync_runs SET status=CASE WHEN (SELECT enabled FROM portfolio_sync_settings WHERE id=1)=1 THEN 'complete' ELSE 'paused' END,finished_at=?,discovered=?,added=(SELECT COUNT(*) FROM portfolio_repository_sync WHERE run_token=? AND origin='draft'),preserved=?,deferred=? WHERE week_key=? AND lease_token=? AND status='running'`).bind(new Date().toISOString(),discovered.length,lease,discovered.length-verified.length-deferred,deferred,week,lease));
  await db.batch(statements);
  const result=await db.prepare('SELECT status,lease_token,added,preserved,deferred FROM portfolio_sync_runs WHERE week_key=?').bind(week).first<Run&{added:number;preserved:number;deferred:number}>();
  if(!result||result.lease_token!==lease)return {week,status:'busy'};
  return {week,status:result.status==='complete'?'complete':'paused',added:result.added,preserved:result.preserved,deferred:result.deferred};
 }catch(error){const code=error instanceof SyncFailure?error.code:'sync_storage_or_network_failed';await db.prepare("UPDATE portfolio_sync_runs SET status='failed',finished_at=?,error_code=? WHERE week_key=? AND lease_token=? AND status='running'").bind(new Date().toISOString(),code,week,lease).run();return {week,status:'failed',code};}
}
