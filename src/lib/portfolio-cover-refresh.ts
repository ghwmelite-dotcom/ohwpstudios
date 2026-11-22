import type {D1Database} from '@cloudflare/workers-types';
import {canonicalRepository} from './portfolio-sync';
import {repositoryCoverUrl,type CoverRepository} from './repository-covers';
const SHARED='/images/work/studies/repository.svg';
/** One-time upgrade of importer placeholders. Never called by the weekly sync. */
export async function refreshImportedCovers(db:D1Database,repositories:(CoverRepository&{full_name:string})[]){
 const rows=(await db.prepare("SELECT p.id,p.repository_url,s.repository_id FROM portfolio_projects p JOIN portfolio_repository_sync s ON s.project_id=p.id WHERE s.origin='draft' AND p.featured_image=?").bind(SHARED).all<{id:number;repository_url:string|null;repository_id:number}>()).results;
 const statements=rows.flatMap(row=>{
  const repo=repositories.find(item=>item.id===row.repository_id);if(!repo||canonicalRepository(row.repository_url)!==`https://github.com/${repo.full_name}`.toLowerCase())return [];
  const cover=repositoryCoverUrl(repo);
  return [db.prepare("UPDATE portfolio_projects SET featured_image=?,thumbnail_image=CASE WHEN thumbnail_image=? THEN ? ELSE thumbnail_image END WHERE id=? AND featured_image=? AND repository_url=? AND EXISTS(SELECT 1 FROM portfolio_repository_sync s WHERE s.project_id=portfolio_projects.id AND s.repository_id=? AND s.origin='draft')").bind(cover,SHARED,cover,row.id,SHARED,row.repository_url,repo.id)];
 });
 if(!statements.length)return{candidates:rows.length,updated:0};
 const results=await db.batch(statements);return{candidates:rows.length,updated:results.filter(row=>(row.meta.changes??0)>0).length};
}
