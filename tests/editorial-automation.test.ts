import {editorialFailureMessage} from '../src/lib/editorial-admin';
import { test, expect, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { readFileSync } from 'node:fs';
import type { D1Database } from '@cloudflare/workers-types';
import { EDITORIAL_THEMES } from '../src/content/editorial-themes';
import { generateWeeklyDraft, generateScheduledDraft, validateArticle, renderArticle, fetchEditorialSource, weekKey, nextEditorialRun, type EditorialEnvironment, type GeneratedArticle } from '../src/lib/editorial-automation';

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

test('short checklist labels remain valid and oversized metadata is shortened safely',()=>{
  const f=fixture();const article={...f.article,seo_description:'Review the customer journey and its recovery behaviour before commissioning your next software project. '.repeat(4),sections:f.article.sections.map(section=>({...section,bullets:['Booking','Payment']}))};
  const parsed=validateArticle({response:article},2,[]);expect(parsed.sections[0].bullets).toEqual(['Booking','Payment']);expect(parsed.seo_description.length).toBeLessThanOrEqual(160);
});

test('source fetch rejects external redirects and failures before calling AI',async()=>{
  let requests=0;const redirect:typeof fetch=async()=>{requests++;return new Response(null,{status:302,headers:{Location:'http://127.0.0.1/private'}});};
  await expect(fetchEditorialSource(EDITORIAL_THEMES[0].sources[0],redirect)).rejects.toThrow('source_host_rejected');expect(requests).toBe(1);
  const f=fixture();expect((await generateWeeklyDraft(f.env,monday,{fetcher:async()=>new Response('unavailable',{status:503})})).status).toBe('failed');expect(f.calls()).toBe(0);
});

test('an official source fallback preserves canonical citations and still enforces the host allowlist',async()=>{
  const source=EDITORIAL_THEMES[0].sources[0];const f=fixture();let requests=0;
  const fetcher:typeof fetch=async(url,options)=>{requests++;return String(url)===source.url?new Response('Unavailable',{status:403}):f.fetcher(url,options);};
  const result=await fetchEditorialSource(source,fetcher);expect(requests).toBe(2);expect(result.url).toBe(source.url);expect(result.retrieved_url).toBe(source.fallback_url!);expect(result.sha256).toHaveLength(64);
  await expect(fetchEditorialSource({...source,fallback_url:'http://127.0.0.1/private'},async()=>new Response('Unavailable',{status:403}))).rejects.toThrow('source_host_rejected');
});

test('a byte-identical later article rolls back its insert and preserves earlier drafts',async()=>{
  const f=fixture();await generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher});f.env.AI.run=async()=>({response:{...f.article,title:'A distinct checklist for maintaining accessible customer recovery journeys'}});
  expect((await generateWeeklyDraft(f.env,new Date('2026-11-30T09:00:00Z'),{fetcher:f.fetcher})).status).toBe('failed');expect(f.sqlite.prepare('SELECT count(*) AS n FROM blog_posts').get()).toEqual({n:1});
});

test('schedule and Monday week keys use Accra/UTC consistently',()=>{
  expect(weekKey(new Date('2026-11-22T23:59:59Z'))).toBe('2026-11-16');expect(weekKey(monday)).toBe('2026-11-23');expect(nextEditorialRun(new Date('2026-11-22T12:00:00Z'))).toBe('2026-11-23T09:00:00.000Z');
  expect(nextEditorialRun(monday)).toBe('2026-11-30T09:00:00.000Z');expect(readFileSync('workers/editorial/wrangler.toml','utf8')).toContain('0 9 * * MON');
});

test('provider receives an enforced article schema and field failures remain private and retry-bounded',async()=>{
  const f=fixture();let calls=0;
  f.env.AI.run=async(_model,input)=>{calls++;expect(input.response_format.type).toBe('json_schema');expect(input.response_format.json_schema).toMatchObject({type:'object',required:['title','excerpt','seo_title','seo_description','answer','sections','faqs']});expect(input.max_tokens).toBe(5000);return{response:{...f.article,title:'x'.repeat(152)}};};
  expect(await generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher})).toMatchObject({status:'failed',code:'model_title_invalid'});
  expect(f.sqlite.prepare('SELECT COUNT(*) AS n FROM blog_posts').get()).toEqual({n:0});
  expect(f.sqlite.prepare('SELECT attempt_count,error_code FROM editorial_runs').get()).toEqual({attempt_count:1,error_code:'model_title_invalid'});
  f.env.AI.run=async()=>{calls++;return{response:f.article};};
  expect((await generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher,retry:true})).status).toBe('draft');
  expect(f.sqlite.prepare('SELECT published,published_at FROM blog_posts').get()).toEqual({published:0,published_at:null});
  expect((await generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher,retry:true})).status).toBe('existing');expect(calls).toBe(2);
});

test('validation diagnostics identify structural faults without storing model text',()=>{
  const f=fixture();expect(()=>validateArticle({response:'not valid JSON'},2,[])).toThrow('model_json_invalid');
  expect(()=>validateArticle({...f.article,title:'x'.repeat(152)},2,[])).toThrow('model_title_invalid');
  expect(()=>validateArticle({...f.article,sections:f.article.sections.map(section=>({...section,source_ids:[99]}))},2,[])).toThrow('model_section_sources_invalid');
  expect(()=>validateArticle({...f.article,faqs:[{question:'A useful question about the proposed booking workflow',answer:'Short'},{question:'Another useful question about the same workflow',answer:'Short'}]},2,[])).toThrow('model_faq_answer_invalid');
});

test('admin diagnostics explain failures without reflecting unknown provider text',()=>{
 expect(editorialFailureMessage('invalid_model_output')).toContain('article format');
 expect(editorialFailureMessage('model_title_invalid')).toContain('title');
 expect(editorialFailureMessage('<script>provider payload</script>')).not.toContain('<script>');
 expect(typeof editorialFailureMessage('__proto__')).toBe('string');
});

test('scheduled format failures get one automatic retry inside the existing two-attempt cap',async()=>{
 const f=fixture();let calls=0;f.env.AI.run=async()=>{calls++;return calls===1?{response:'not JSON'}:{response:f.article};};
 expect((await generateScheduledDraft(f.env,monday,{fetcher:f.fetcher})).status).toBe('draft');expect(calls).toBe(2);
 expect(f.sqlite.prepare('SELECT attempt_count,status FROM editorial_runs').get()).toEqual({attempt_count:2,status:'draft'});
 expect(f.sqlite.prepare('SELECT published,published_at FROM blog_posts').get()).toEqual({published:0,published_at:null});
 await generateScheduledDraft(f.env,monday,{fetcher:f.fetcher});expect(calls).toBe(2);
});
test('automatic retries stop after two invalid responses and do not retry provider failures',async()=>{
 const f=fixture();let calls=0;f.env.AI.run=async()=>{calls++;return{response:'not JSON'};};
 expect((await generateScheduledDraft(f.env,monday,{fetcher:f.fetcher})).status).toBe('failed');expect(calls).toBe(2);
 await generateScheduledDraft(f.env,monday,{fetcher:f.fetcher});expect(calls).toBe(2);
 const provider=fixture();let providerCalls=0;provider.env.AI.run=async()=>{providerCalls++;throw Error('Provider failed');};
 await generateScheduledDraft(provider.env,monday,{fetcher:provider.fetcher});expect(providerCalls).toBe(1);
});

test('service rotation keeps previous topic identities and links every workspace intent to the actual service',async()=>{
 const f=fixture();await generateWeeklyDraft(f.env,monday,{fetcher:f.fetcher});
 expect(f.sqlite.prepare('SELECT topic_key FROM editorial_runs').get()).toEqual({topic_key:'mobile-resilience'});
 f.env.AI.run=async()=>({response:{...f.article,title:'Is my Windows computer ready for a supported AI workspace?'}});
 await generateWeeklyDraft(f.env,new Date('2026-11-30T09:00:00Z'),{fetcher:f.fetcher});
 expect(f.sqlite.prepare('SELECT topic_key FROM editorial_runs WHERE week_key=?').get('2026-11-30')).toEqual({topic_key:'workspace-readiness'});
 const themes=EDITORIAL_THEMES.filter(t=>t.id.startsWith('workspace-'));
 expect(themes).toHaveLength(8);expect(new Set(themes.map(t=>t.id)).size).toBe(8);
 for(const theme of themes){expect(theme.internal).toBe('/services/ai-workspace-setup');expect(readFileSync('public'+theme.cover,'utf8')).toContain('<svg');}
});

test('serialized model scaffolding inside prose is rejected rather than saved as an article',()=>{
 const f=fixture();const sections=f.article.sections.map((section,i)=>i?section:{...section,paragraphs:[section.paragraphs[0]+` {'paragraphs': ['model scaffolding'], 'source_ids': []}`]});
 expect(()=>validateArticle({...f.article,sections},2,[])).toThrow('model_embedded_structure');
});
