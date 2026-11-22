import {expect,test} from 'bun:test';import {Database} from 'bun:sqlite';import {readFileSync} from 'node:fs';
import {refreshImportedCovers} from '../src/lib/portfolio-cover-refresh';
test('placeholder refresh preserves custom images, owner fields and publication states',async()=>{
 const sqlite=new Database(':memory:');try{
 for(const file of ['011_portfolio_system.sql','052_portfolio_repository_provenance.sql','053_weekly_portfolio_sync.sql'])sqlite.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
 const prepare=(sql:string,params:(string|number|null)[]=[])=>({bind:(...values:(string|number|null)[])=>prepare(sql,values),all:async()=>({results:sqlite.prepare(sql).all(...params)}),run:async()=>{const result=sqlite.prepare(sql).run(...params);return{success:true,meta:{changes:result.changes}};}});type Statement=ReturnType<typeof prepare>;
 const db={prepare,batch:async(statements:Statement[])=>{sqlite.exec('BEGIN');try{const values=[];for(const s of statements)values.push(await s.run());sqlite.exec('COMMIT');return values;}catch(error){sqlite.exec('ROLLBACK');throw error;}}} as unknown as D1Database;
 const shared='/images/work/studies/repository.svg';const insert=sqlite.prepare('INSERT INTO portfolio_projects(id,title,slug,description,featured_image,thumbnail_image,repository_url,is_published,is_featured) VALUES(?,?,?,?,?,?,?,?,?)');
 for(let id=1;id<=4;id++){insert.run(id,'Owner title '+id,'owner-'+id,'Owner description',id===2?'/custom-cover.svg':shared,id===1?'/custom-thumb.svg':shared,'https://github.com/ghwmelite-dotcom/Repo-'+id,id%2,1);sqlite.prepare("INSERT INTO portfolio_repository_sync(repository_id,repository_url,project_id,origin,run_token,discovered_at) VALUES(?,?,?,?,'test','now')").run(id,'https://github.com/ghwmelite-dotcom/Repo-'+id,id,id===3?'existing':'draft');}
 sqlite.exec("UPDATE portfolio_projects SET repository_url='https://github.com/ghwmelite-dotcom/Owner-edited-source' WHERE id=4");
 const before=sqlite.query('SELECT id,title,slug,description,is_published,is_featured FROM portfolio_projects ORDER BY id').all();
 const repos=[1,2,3,4].map(id=>({id,name:'Repo-'+id,full_name:'ghwmelite-dotcom/Repo-'+id,description:'Software'}));
 expect(await refreshImportedCovers(db,repos)).toEqual({candidates:2,updated:1});
 expect(sqlite.query('SELECT id,title,slug,description,is_published,is_featured FROM portfolio_projects ORDER BY id').all()).toEqual(before);
 expect(sqlite.query('SELECT thumbnail_image FROM portfolio_projects WHERE id=1').get()).toEqual({thumbnail_image:'/custom-thumb.svg'});
 expect(sqlite.query('SELECT featured_image FROM portfolio_projects WHERE id=2').get()).toEqual({featured_image:'/custom-cover.svg'});
 expect(sqlite.query('SELECT featured_image FROM portfolio_projects WHERE id=3').get()).toEqual({featured_image:shared});
 expect(sqlite.query('SELECT featured_image FROM portfolio_projects WHERE id=4').get()).toEqual({featured_image:shared});
 expect((await refreshImportedCovers(db,repos)).updated).toBe(0);
 }finally{sqlite.close();}
});
