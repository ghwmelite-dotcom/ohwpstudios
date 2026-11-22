import { test, expect, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import type { D1Database } from '@cloudflare/workers-types';
import { EDITORIAL_THEMES } from '../src/content/editorial-themes';
import { generateWeeklyDraft, validateArticle, renderArticle, fetchEditorialSource, weekKey, nextEditorialRun, type EditorialEnvironment, type GeneratedArticle } from '../src/lib/editorial-automation';

const open:Database[]=[];
function fixture() {
  const sqlite=new Database(':memory:');open.push(sqlite);sqlite.exec('PRAGMA foreign_keys=ON');
  sqlite.exec(readFileSync('migrations/004_blog_posts.sql','utf8').split('-- Insert sample')[0]);
  sqlite.exec(readFileSync('migrations/051_weekly_editorial_drafts.sql','utf8'));
  type Value=string|number|null;
  const prepare=(sql:string,values:Value[]=[])=>({bind:(...params:Value[])=>prepare(sql,params),first:async()=>sqlite.prepare(sql).get(...values),all:async()=>({results:sqlite.prepare(sql).all(...values)}),runSync:()=>{const result=sqlite.prepare(sql).run(...values);return{meta:{changes:result.changes,last_row_id:Number(result.lastInsertRowid)}};},run:async()=>prepare(sql,values).runSync()});
  const db={prepare,batch:async(statements:ReturnType<typeof prepare>[])=>sqlite.transaction(()=>statements.map(s=>s.runSync()))()} as unknown as D1Database;
  const article:GeneratedArticle={title:'Recovering a customer booking after a lost mobile connection',seo_title:'Recover a Booking After a Lost Mobile Connection in Ghana',seo_description:'Plan recoverable booking journeys for Ghanaian customers: saved form drafts, understandable pending states, practical support and acceptance checks.',excerpt:'A practical guide to helping customers recover a booking journey when their mobile connection drops.',answer:'A booking journey should explain what was saved, what remains pending and how the customer can continue without creating a duplicate appointment. Agree the recovery behaviour with staff before choosing the interface.',sections:Array.from({length:5},(_,i)=>({heading:`Decision ${i+1}: make the recovery behaviour clear`,paragraphs:[`Scenario ${i+1}: `+Array(7).fill('A practical planning example starts with the customer task and the information the team needs to preserve. Agree who owns the next step and test the interrupted journey on a real device.').join(' ')],bullets:['Check the saved reference before allowing a second submission.'],source_ids:[1,2]})),faqs:[{question:'Should a retry create another booking?',answer:'Review the saved reference first and define whether a retry continues the earlier attempt or starts a new request. Staff and customers should see the same confirmed state.'},{question:'What should we test before release?',answer:'Test interruptions at each transition, including a slow response and a customer returning later. Confirm that the interface preserves the draft and explains what to do next.'}]};
  let calls=0;let prompt='';
  const env:EditorialEnvironment={DB:db,AI:{run:async(_model,input)=>{calls++;prompt=JSON.stringify(input.messages);return{response:article};}}};
  const fetcher:typeof fetch=async()=>new Response(`<main>${'Official reference information about accessible user workflows and recoverable customer interactions. '.repeat(70)}</main>`,{headers:{'Content-Type':'text/html'}});
  return{sqlite,env,article,fetcher,calls:()=>calls,prompt:()=>prompt};
}
afterEach(()=>open.splice(0).forEach(db=>db.close()));
const monday=new Date('2026-11-23T09:00:00Z');

test('one atomic weekly claim produces a private draft, including under concurrent invocation',async()=>{
  const f=fixture();const results=await Promise.all([generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher}),generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher})]);
  expect(results.map(r=>r.status).sort()).toEqual(['busy','draft']);expect(f.calls()).toBe(1);
  expect(f.sqlite.prepare('SELECT published,published_at,author FROM blog_posts').get()).toEqual({published:0,published_at:null,author:'Hodges & Co. Studios'});
  expect((await generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher,retry:true})).status).toBe('existing');expect(f.calls()).toBe(1);
  expect(f.prompt()).toContain('untrusted reference data');expect(f.prompt()).not.toContain('client_users');
});

test('failures are recorded, explicit retries are bounded, and pause consumes no weekly slot',async()=>{
  const f=fixture();f.sqlite.exec('UPDATE editorial_settings SET enabled=0');expect((await generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher})).status).toBe('paused');expect(f.calls()).toBe(0);
  f.sqlite.exec('UPDATE editorial_settings SET enabled=1');let calls=0;f.env.AI.run=async()=>{calls++;throw Error('Provider detail must never be stored');};
  expect((await generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher})).status).toBe('failed');
  await generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher});expect(calls).toBe(1);
  await generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher,retry:true});await generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher,retry:true});expect(calls).toBe(2);
  expect(f.sqlite.prepare('SELECT attempt_count,error_code FROM editorial_runs').get()).toEqual({attempt_count:2,error_code:'workers_ai_failed'});
  expect(f.sqlite.prepare('SELECT count(*) AS n FROM blog_posts').get()).toEqual({n:0});
});

test('pause during inference prevents a draft, and deleting a draft preserves the run ledger',async()=>{
  const f=fixture();f.env.AI.run=async()=>{f.sqlite.exec('UPDATE editorial_settings SET enabled=0');return{response:f.article};};
  expect((await generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher})).status).toBe('failed');expect(f.sqlite.prepare('SELECT count(*) AS n FROM blog_posts').get()).toEqual({n:0});
  f.sqlite.exec('UPDATE editorial_settings SET enabled=1');f.env.AI.run=async()=>({response:f.article});await generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher,retry:true});
  f.sqlite.exec('DELETE FROM blog_posts');expect(f.sqlite.prepare('SELECT status,post_id FROM editorial_runs').get()).toEqual({status:'draft',post_id:null});
  expect((await generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher})).status).toBe('existing');
});

test('generated HTML and fake citations fail validation; publication fields cannot override draft state',async()=>{
  const f=fixture();expect(()=>validateArticle({...f.article,title:'<img src=x onerror=alert(1)>'},2,[])).toThrow();
  expect(()=>validateArticle({...f.article,sections:f.article.sections.map(s=>({...s,source_ids:[99]}))},2,[])).toThrow();
  expect(()=>validateArticle(f.article,2,[{title:f.article.title,slug:'existing'}])).toThrow('duplicate_search_intent');
  expect(()=>validateArticle({...f.article,title:'Planning a reliable customer booking journey to'},2,[])).toThrow('unfinished_title');
  expect(()=>validateArticle({...f.article,sections:f.article.sections.map(section=>({...section,paragraphs:f.article.sections[0].paragraphs}))},2,[])).toThrow('repetitive_article');
  f.env.AI.run=async()=>({response:{...f.article,published:1,published_at:'now',slug:'steal-existing',author:'Invented expert'}});
  await generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher});expect(f.sqlite.prepare('SELECT published,published_at,author FROM blog_posts').get()).toEqual({published:0,published_at:null,author:'Hodges & Co. Studios'});
  const html=renderArticle({...f.article,answer:'A safe & useful answer'},[{title:'Official & current',url:'https://www.w3.org/',retrieved_url:'https://www.w3.org/',fetched_at:monday.toISOString(),sha256:'digest'},{title:'Other',url:'https://www.w3.org/',retrieved_url:'https://www.w3.org/',fetched_at:monday.toISOString(),sha256:'digest'}],EDITORIAL_THEMES[0]);expect(html).toContain('A safe &amp; useful answer');
});

test('an expired lease cannot save a draft or overwrite the replacement run',async()=>{
  const f=fixture();f.env.AI.run=async()=>{f.sqlite.exec("UPDATE editorial_runs SET lease_token='replacement',attempt_count=2");return{response:f.article};};
  expect((await generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher})).status).toBe('failed');
  expect(f.sqlite.prepare('SELECT count(*) AS n FROM blog_posts').get()).toEqual({n:0});
  expect(f.sqlite.prepare('SELECT status,lease_token FROM editorial_runs').get()).toEqual({status:'running',lease_token:'replacement'});
});

test('source fetch rejects external redirects and failures before calling AI',async()=>{
  let requests=0;const redirect:typeof fetch=async()=>{requests++;return new Response(null,{status:302,headers:{Location:'http://127.0.0.1/private'}});};
  await expect(fetchEditorialSource(EDITORIAL_THEMES[0].sources[0],redirect)).rejects.toThrow('source_host_rejected');expect(requests).toBe(1);
  const f=fixture();expect((await generateWeeklyDraft(f.env,monday,{fetcher:async()=>new Response('unavailable',{status:503})})).status).toBe('failed');expect(f.calls()).toBe(0);
});

test('a byte-identical later article rolls back its insert and preserves earlier drafts',async()=>{
  const f=fixture();await generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher});f.env.AI.run=async()=>({response:{...f.article,title:'A distinct checklist for maintaining accessible customer recovery journeys'}});
  expect((await generateWeeklyDraft(f.env,new Date('2026-11-30T09:00:00Z'),{fetcher:f.fetcher})).status).toBe('failed');expect(f.sqlite.prepare('SELECT count(*) AS n FROM blog_posts').get()).toEqual({n:1});
});

test('schedule and Monday week keys use Accra/UTC consistently',()=>{
  expect(weekKey(new Date('2026-11-22T23:59:59Z'))).toBe('2026-11-16');expect(weekKey(monday)).toBe('2026-11-23');expect(nextEditorialRun(new Date('2026-11-22T12:00:00Z'))).toBe('2026-11-23T09:00:00.000Z');
  expect(nextEditorialRun(monday)).toBe('2026-11-30T09:00:00.000Z');expect(readFileSync('workers/editorial/wrangler.toml','utf8')).toContain('0 9 * * MON');
});
