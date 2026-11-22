import {afterEach,expect,test} from 'bun:test';
import {Database} from 'bun:sqlite';
import {readFileSync} from 'node:fs';
import {importRepositoryPortfolio} from '../src/lib/portfolio-import';
import {portfolioPresentation,portfolioDetail} from '../src/lib/portfolio-presentation';
import {POST,PUT} from '../src/pages/api/admin/portfolio';
const stores:Database[]=[];
function fixture(){
 const sqlite=new Database(':memory:');stores.push(sqlite);
 for(const file of ['011_portfolio_system.sql','052_portfolio_repository_provenance.sql'])sqlite.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
 const prepare=(sql:string,values:(string|number|null)[]=[])=>({bind:(...params:(string|number|null)[])=>prepare(sql,params),all:async()=>({results:sqlite.prepare(sql).all(...values),success:true}),first:async()=>sqlite.prepare(sql).get(...values),run:async()=>{const r=sqlite.prepare(sql).run(...values);return {success:true,meta:{changes:r.changes,last_row_id:Number(r.lastInsertRowid)}};}});
 type Statement=ReturnType<typeof prepare>;
 const db={prepare,batch:async(statements:Statement[])=>{sqlite.exec('BEGIN');try{const results=[];for(const statement of statements)results.push(await statement.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}} as unknown as D1Database;
 return {sqlite,db};
}
const publicRepo=(async(input:RequestInfo|URL)=>Response.json({private:false,fork:false,archived:false,full_name:String(input).split('/repos/')[1]})) as typeof fetch;
afterEach(()=>stores.splice(0).forEach(db=>db.close()));
test('curated import uses real SQL, preserves edits, and is idempotent',async()=>{
 const {sqlite,db}=fixture();let calls=0;
 const verified=(async(...args:Parameters<typeof fetch>)=>{calls++;return publicRepo(...args);}) as typeof fetch;
 expect(await importRepositoryPortfolio(db,verified)).toEqual({added:8,preserved:0});
 expect(sqlite.query('SELECT COUNT(*) AS n FROM portfolio_projects WHERE is_published=0').get()).toEqual({n:5});
 expect(sqlite.query('SELECT COUNT(*) AS n FROM portfolio_projects WHERE repository_readme_sha IS NOT NULL').get()).toEqual({n:8});
 sqlite.exec("UPDATE portfolio_projects SET title='Owner edit' WHERE slug='afrilab'");
 expect(await importRepositoryPortfolio(db,verified)).toEqual({added:0,preserved:8});expect(calls).toBe(8);
 expect(sqlite.query("SELECT title FROM portfolio_projects WHERE slug='afrilab'").get()).toEqual({title:'Owner edit'});
 expect((await portfolioPresentation(db)).length).toBe(3);
 expect(await portfolioDetail(db,'funeralpress')).toBeUndefined();
 sqlite.exec("UPDATE portfolio_projects SET is_published=0 WHERE slug='afrilab'");
 expect(await portfolioDetail(db,'afrilab')).toBeUndefined();
 expect((await portfolioPresentation(db)).some(p=>p.slug==='afrilab')).toBe(false);
});
test('visibility verification fails closed before writing any records',async()=>{
 const {sqlite,db}=fixture();
 const privateRepo=(async()=>Response.json({private:true,fork:false,archived:false,full_name:'ghwmelite-dotcom/AfriLab'})) as typeof fetch;
 await expect(importRepositoryPortfolio(db,privateRepo)).rejects.toThrow();
 expect(sqlite.query('SELECT COUNT(*) AS n FROM portfolio_projects').get()).toEqual({n:0});
});
test('storage errors and redirected repository checks fail closed',async()=>{
 const unavailable={prepare:()=>{throw Error('Storage unavailable');}} as unknown as D1Database;
 expect(await portfolioPresentation(unavailable)).toEqual([]);
 expect(await portfolioDetail(unavailable,'afrilab')).toBeUndefined();
 const {sqlite,db}=fixture();
 const redirect=(async(_input:RequestInfo|URL,init?:RequestInit)=>{expect(init?.redirect).toBe('manual');return new Response(null,{status:302,headers:{Location:'https://example.test'}});}) as typeof fetch;
 await expect(importRepositoryPortfolio(db,redirect)).rejects.toThrow();
 expect(sqlite.query('SELECT COUNT(*) AS n FROM portfolio_projects').get()).toEqual({n:0});
});
function context(db:D1Database,body:object){return {request:new Request('http://localhost/api/admin/portfolio',{method:'POST',body:JSON.stringify(body)}),locals:{runtime:{env:{DB:db}}}} as unknown as Parameters<typeof POST>[0];}
test('fixed-field writes reject column injection and retain slugs and publication state',async()=>{
 const {sqlite,db}=fixture();
 expect((await POST(context(db,{title:'Real project',is_published:0,featured_image:'/images/work/studies/brilla.svg'}))).status).toBe(201);
 expect((await PUT(context(db,{id:1,title:'Updated title'}))).status).toBe(200);
 expect(sqlite.query('SELECT slug,is_published FROM portfolio_projects').get()).toEqual({slug:'real-project',is_published:0});
 expect((await PUT(context(db,{id:1,is_published:1,is_featured:1}))).status).toBe(200);
 expect((await PUT(context(db,{id:1,is_published:0,is_featured:0}))).status).toBe(200);
 expect(sqlite.query('SELECT is_published,is_featured FROM portfolio_projects').get()).toEqual({is_published:0,is_featured:0});
 expect((await PUT(context(db,{id:1,'title=?,is_published=1 --':'bad'}))).status).toBe(400);
 expect((await POST(context(db,{title:'Real project'}))).status).toBe(409);
 expect((await PUT(context(db,{id:99,title:'Absent'}))).status).toBe(404);
});
test('detail lookup is independent of listing limit and cannot expose drafts',async()=>{
 const {sqlite,db}=fixture();const insert=sqlite.prepare('INSERT INTO portfolio_projects(title,slug,is_published,display_order) VALUES(?,?,1,?)');
 for(let i=0;i<70;i++)insert.run('Project '+i,'project-'+i,i);
 expect((await portfolioDetail(db,'project-69'))?.title).toBe('Project 69');
 expect(await portfolioDetail(db,"' OR 1=1 --")).toBeUndefined();
});
test('historical unverified seed claims remain stored but are not republished',async()=>{
 const {sqlite,db}=fixture();
 sqlite.exec("INSERT INTO portfolio_projects(title,slug,is_published) VALUES('Legacy claim','ai-football-predictions-platform',1)");
 expect((await portfolioPresentation(db)).some(p=>p.slug==='ai-football-predictions-platform')).toBe(false);
 expect(await portfolioDetail(db,'ai-football-predictions-platform')).toBeUndefined();
 expect(sqlite.query('SELECT COUNT(*) AS n FROM portfolio_projects').get()).toEqual({n:1});
});
