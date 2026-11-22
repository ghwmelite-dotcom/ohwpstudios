import {afterEach,expect,test} from 'bun:test';
import {Database} from 'bun:sqlite';
import {readFileSync} from 'node:fs';
import {canonicalRepository,discoverPublicRepositories,nextPortfolioSync,portfolioWeek,syncWeeklyPortfolio} from '../src/lib/portfolio-sync';
const open:Database[]=[];
function fixture(){const sqlite=new Database(':memory:');open.push(sqlite);sqlite.exec('PRAGMA foreign_keys=ON');for(const file of ['011_portfolio_system.sql','052_portfolio_repository_provenance.sql','053_weekly_portfolio_sync.sql'])sqlite.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
 const prepare=(sql:string,params:(string|number|null)[]=[])=>({bind:(...values:(string|number|null)[])=>prepare(sql,values),all:async()=>({success:true,results:sqlite.prepare(sql).all(...params)}),first:async()=>sqlite.prepare(sql).get(...params),run:async()=>{const r=sqlite.prepare(sql).run(...params);return {success:true,meta:{changes:r.changes,last_row_id:Number(r.lastInsertRowid)}};}});
 type Statement=ReturnType<typeof prepare>;let failBatch=false;
 const db={prepare,batch:async(statements:Statement[])=>{sqlite.exec('BEGIN');try{const rows=[];for(const s of statements){rows.push(await s.run());if(failBatch)throw Error('Injected failure');}sqlite.exec('COMMIT');return rows;}catch(error){sqlite.exec('ROLLBACK');throw error;}}} as unknown as D1Database;
 return{sqlite,db,failBatch:()=>{failBatch=true;}};}
afterEach(()=>open.splice(0).forEach(db=>db.close()));
const monday=new Date('2026-11-23T10:00:00Z');
function repository(id=1,name='New-Project'){return{id,name,full_name:'ghwmelite-dotcom/'+name,owner:{login:'ghwmelite-dotcom'},private:false,visibility:'public',fork:false,archived:false,disabled:false,size:10,description:'A useful public project.',language:'TypeScript'};}
type Repo=ReturnType<typeof repository>;
function provider(list:Repo[],onDetail?:()=>void){let calls=0;const fetcher=(async(input:RequestInfo|URL,init?:RequestInit)=>{calls++;expect(init?.redirect).toBe('manual');expect(new Headers(init?.headers).has('Authorization')).toBe(false);if(String(input).includes('/users/'))return Response.json(list);onDetail?.();const name=decodeURIComponent(new URL(String(input)).pathname.split('/').at(-1)!);const found=list.find(r=>r.name===name);return found?Response.json(found):new Response(null,{status:404});}) as typeof fetch;return{fetcher,calls:()=>calls};}
test('weekly discovery creates only drafts; repeats preserve edits and removed drafts',async()=>{
 const f=fixture(),p=provider([repository()]);expect(await syncWeeklyPortfolio(f.db,monday,{fetcher:p.fetcher})).toMatchObject({status:'complete',added:1});
 expect(f.sqlite.query('SELECT is_published,is_featured,results,project_url FROM portfolio_projects').get()).toEqual({is_published:0,is_featured:0,results:null,project_url:null});
 f.sqlite.exec("UPDATE portfolio_projects SET title='Owner edit',description='Owner copy',slug='owner-slug',repository_url=NULL,is_published=1");
 expect((await syncWeeklyPortfolio(f.db,monday,{fetcher:p.fetcher,retry:true})).status).toBe('existing');
 await syncWeeklyPortfolio(f.db,new Date('2026-11-30T10:00:00Z'),{fetcher:p.fetcher});expect(f.sqlite.query('SELECT title,description,slug,is_published FROM portfolio_projects').get()).toEqual({title:'Owner edit',description:'Owner copy',slug:'owner-slug',is_published:1});
 f.sqlite.exec('DELETE FROM portfolio_projects');await syncWeeklyPortfolio(f.db,new Date('2026-12-07T10:00:00Z'),{fetcher:p.fetcher});expect(f.sqlite.query('SELECT COUNT(*) AS n FROM portfolio_projects').get()).toEqual({n:0});expect(f.sqlite.query('SELECT project_id FROM portfolio_repository_sync').get()).toEqual({project_id:null});
});
test('canonical URLs adopt existing projects without touching any fields or publishing drafts',async()=>{
 const f=fixture();f.sqlite.exec("INSERT INTO portfolio_projects(title,slug,repository_url,is_published,is_featured,description) VALUES('Owner title','custom-slug','https://github.com/GHWMELITE-DOTCOM/New-Project.git/',0,1,'Owner description')");
 const before=f.sqlite.query('SELECT * FROM portfolio_projects').all();const result=await syncWeeklyPortfolio(f.db,monday,{fetcher:provider([repository()]).fetcher});expect(result).toMatchObject({status:'complete',added:0,preserved:1});expect(f.sqlite.query('SELECT * FROM portfolio_projects').all()).toEqual(before);
 expect(canonicalRepository('https://github.com/Owner/Project.git/')).toBe('https://github.com/owner/project');
});
test('stable repository ID prevents duplicate entries after rename',async()=>{
 const f=fixture();await syncWeeklyPortfolio(f.db,monday,{fetcher:provider([repository()]).fetcher});await syncWeeklyPortfolio(f.db,new Date('2026-11-30T10:00:00Z'),{fetcher:provider([repository(1,'Renamed')]).fetcher});expect(f.sqlite.query('SELECT COUNT(*) AS n FROM portfolio_projects').get()).toEqual({n:1});
});
test('private, foreign, forked, archived, disabled and empty repos are excluded',async()=>{
 const f=fixture();const invalid=[{...repository(1),private:true},{...repository(2),visibility:'private'},{...repository(3),fork:true},{...repository(4),archived:true},{...repository(5),disabled:true},{...repository(6),size:0},{...repository(7),owner:{login:'outsider'}}];
 expect(await syncWeeklyPortfolio(f.db,monday,{fetcher:provider(invalid).fetcher})).toMatchObject({status:'complete',added:0});expect(f.sqlite.query('SELECT COUNT(*) AS n FROM portfolio_projects').get()).toEqual({n:0});
});
test('a repository becoming private between listing and verification is never inserted',async()=>{
 const f=fixture();const fetcher=(async(input:RequestInfo|URL)=>String(input).includes('/users/')?Response.json([repository()]):Response.json({...repository(),private:true,visibility:'private'})) as typeof fetch;
 expect(await syncWeeklyPortfolio(f.db,monday,{fetcher})).toMatchObject({status:'complete',added:0});
});
test('concurrent invocations have one claimant; completed weeks cannot be replayed',async()=>{
 const f=fixture();const p=provider([repository()]);const results=await Promise.all([syncWeeklyPortfolio(f.db,monday,{fetcher:p.fetcher}),syncWeeklyPortfolio(f.db,monday,{fetcher:p.fetcher})]);expect(results.map(r=>r.status).sort()).toEqual(['busy','complete']);expect(p.calls()).toBe(2);
});
test('provider failure has no partial project writes and explicit retries are bounded',async()=>{
 const f=fixture();let calls=0;const fetcher=(async()=>{calls++;return new Response('private provider error',{status:403});}) as typeof fetch;
 expect(await syncWeeklyPortfolio(f.db,monday,{fetcher})).toMatchObject({status:'failed',code:'github_rate_limited'});expect((await syncWeeklyPortfolio(f.db,monday,{fetcher})).status).toBe('busy');await syncWeeklyPortfolio(f.db,monday,{fetcher,retry:true});await syncWeeklyPortfolio(f.db,monday,{fetcher,retry:true});expect(calls).toBe(2);expect(f.sqlite.query('SELECT attempt_count,error_code FROM portfolio_sync_runs').get()).toEqual({attempt_count:2,error_code:'github_rate_limited'});expect(f.sqlite.query('SELECT COUNT(*) AS n FROM portfolio_projects').get()).toEqual({n:0});
});
test('pause before claim consumes no slot; pause during fetch prevents all imports',async()=>{
 const f=fixture();f.sqlite.exec('UPDATE portfolio_sync_settings SET enabled=0');expect((await syncWeeklyPortfolio(f.db,monday)).status).toBe('paused');expect(f.sqlite.query('SELECT COUNT(*) AS n FROM portfolio_sync_runs').get()).toEqual({n:0});
 f.sqlite.exec('UPDATE portfolio_sync_settings SET enabled=1');const p=provider([repository()],()=>f.sqlite.exec('UPDATE portfolio_sync_settings SET enabled=0'));expect(await syncWeeklyPortfolio(f.db,monday,{fetcher:p.fetcher})).toMatchObject({status:'paused',added:0});expect(f.sqlite.query('SELECT COUNT(*) AS n FROM portfolio_projects').get()).toEqual({n:0});
});
test('an expired lease cannot commit over its replacement',async()=>{
 const f=fixture();const p=provider([repository()],()=>f.sqlite.exec("UPDATE portfolio_sync_runs SET lease_token='replacement',attempt_count=2"));expect((await syncWeeklyPortfolio(f.db,monday,{fetcher:p.fetcher})).status).toBe('busy');expect(f.sqlite.query('SELECT COUNT(*) AS n FROM portfolio_projects').get()).toEqual({n:0});
});
test('D1 batch failure rolls back drafts, categories and identity mappings',async()=>{
 const f=fixture();f.failBatch();expect((await syncWeeklyPortfolio(f.db,monday,{fetcher:provider([repository()]).fetcher})).status).toBe('failed');expect(f.sqlite.query('SELECT COUNT(*) AS n FROM portfolio_projects').get()).toEqual({n:0});expect(f.sqlite.query('SELECT COUNT(*) AS n FROM portfolio_repository_sync').get()).toEqual({n:0});
});
test('bounded backlog, deterministic slugs and metadata cannot override publishing state',async()=>{
 const f=fixture();const projects=Array.from({length:21},(_,i)=>({...repository(i+1,'Repository-'+i),published:1,is_published:1,description:'<script>alert(1)</script> Public description',homepage:'javascript:alert(1)'}));const result=await syncWeeklyPortfolio(f.db,monday,{fetcher:provider(projects).fetcher});expect(result).toMatchObject({status:'complete',added:20,deferred:1});const covers=f.sqlite.query('SELECT featured_image FROM portfolio_projects').all() as {featured_image:string}[];expect(new Set(covers.map(row=>row.featured_image)).size).toBe(20);expect(covers.every(row=>row.featured_image.startsWith('/images/work/repositories/v1/'))).toBe(true);expect(f.sqlite.query('SELECT COUNT(*) AS n FROM portfolio_projects WHERE is_published<>0 OR is_featured<>0 OR project_url IS NOT NULL').get()).toEqual({n:0});expect(f.sqlite.query("SELECT COUNT(*) AS n FROM portfolio_projects WHERE slug LIKE 'github-repository-%'").get()).toEqual({n:20});
});
test('redirects and malformed responses fail closed; public pagination is complete',async()=>{
 const redirect=(async()=>new Response(null,{status:302,headers:{Location:'https://example.test'}})) as typeof fetch;await expect(discoverPublicRepositories(redirect)).rejects.toThrow('github_fetch_failed');
 await expect(discoverPublicRepositories((async()=>Response.json({message:'unexpected'})) as typeof fetch)).rejects.toThrow('github_response_invalid');
 let calls=0;const fetcher=(async()=>{calls++;return Response.json(calls===1?Array.from({length:100},(_,i)=>repository(i+1,'Repo-'+i)):[repository(101,'Last-repo')]);}) as typeof fetch;expect(await discoverPublicRepositories(fetcher)).toHaveLength(101);expect(calls).toBe(2);
});
test('Accra weekly keys and next Monday window agree at the boundary',()=>{
 expect(portfolioWeek(new Date('2026-11-22T23:59:59Z'))).toBe('2026-11-16');expect(nextPortfolioSync(new Date('2026-11-23T09:59:59Z'))).toBe('2026-11-23T10:00:00.000Z');expect(nextPortfolioSync(monday)).toBe('2026-11-30T10:00:00.000Z');
});

test('existing adoption and new drafts share one atomic bounded batch',async()=>{
 const f=fixture();const projects=Array.from({length:40},(_,i)=>repository(i+1,'Repo-'+i));
 const insert=f.sqlite.prepare('INSERT INTO portfolio_projects(title,slug,repository_url,is_published) VALUES(?,?,?,1)');
 for(const item of projects.slice(0,20))insert.run('Owner '+item.name,'owner-'+item.id,'https://github.com/'+item.full_name);
 const result=await syncWeeklyPortfolio(f.db,monday,{fetcher:provider(projects).fetcher});
 expect(result).toMatchObject({status:'complete',added:20,preserved:20,deferred:0});
 expect(f.sqlite.query('SELECT COUNT(*) AS n FROM portfolio_projects WHERE is_published=1').get()).toEqual({n:20});
});

test('an existing project deleted during discovery gains a tombstone, not a replacement',async()=>{
 const f=fixture();f.sqlite.exec("INSERT INTO portfolio_projects(title,slug,repository_url) VALUES('Existing','existing','https://github.com/ghwmelite-dotcom/Existing')");
 const projects=[repository(1,'Existing'),repository(2,'New')];
 await syncWeeklyPortfolio(f.db,monday,{fetcher:provider(projects,()=>f.sqlite.exec("DELETE FROM portfolio_projects WHERE slug='existing'")).fetcher});
 expect(f.sqlite.query('SELECT project_id FROM portfolio_repository_sync WHERE repository_id=1').get()).toEqual({project_id:null});
 await syncWeeklyPortfolio(f.db,new Date('2026-11-30T10:00:00Z'),{fetcher:provider(projects).fetcher});
 expect(f.sqlite.query('SELECT COUNT(*) AS n FROM portfolio_projects').get()).toEqual({n:1});
});
