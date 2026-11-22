import type { D1Database } from '@cloudflare/workers-types';
import { githubPortfolio } from '../data/github-portfolio';
export async function importRepositoryPortfolio(db:D1Database,fetcher:typeof fetch=fetch) {
  const existing=(await db.prepare('SELECT slug,repository_url,project_url FROM portfolio_projects').all<{slug:string;repository_url:string|null;project_url:string|null}>()).results;
  const pending=githubPortfolio.filter(project=>!existing.some(row=>row.slug===project.slug||row.repository_url===project.repository||row.project_url===project.repository));
  // Verify current public visibility before adopting a repository; never use a token.
  await Promise.all(pending.map(async project=>{
    const name=new URL(project.repository).pathname.slice(1);
    const response=await fetcher(`https://api.github.com/repos/${name}`,{redirect:'manual',signal:AbortSignal.timeout(10000),headers:{Accept:'application/vnd.github+json','User-Agent':'HodgesStudioPortfolio/1.0'}});
    if(!response.ok)throw Error(`Repository verification returned HTTP ${response.status}`);
    const data:unknown=await response.json();
    if(!data||typeof data!=='object'||!('private' in data)||data.private!==false||!('archived' in data)||data.archived!==false||!('fork' in data)||data.fork!==false||!('full_name' in data)||String(data.full_name).toLowerCase()!==name.toLowerCase()||!name.startsWith('ghwmelite-dotcom/'))throw Error('Only verified public owned projects can be imported');
  }));
  if(!pending.length)return {added:0,preserved:githubPortfolio.length};
  const statements=pending.flatMap((project,index)=>{
    const categorySlug=project.category.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
    return [db.prepare('INSERT OR IGNORE INTO portfolio_categories(name,slug,description) VALUES(?,?,?)').bind(project.category,categorySlug,'Curated studio project discipline'),
      db.prepare(`INSERT INTO portfolio_projects(title,slug,subtitle,description,project_url,featured_image,thumbnail_image,challenge,solution,category_id,is_featured,is_published,display_order,meta_title,meta_description,repository_url,repository_readme_sha,repository_verified_at) SELECT ?,?,?,?,?,?,?,?,?,(SELECT id FROM portfolio_categories WHERE slug=? OR name=? LIMIT 1),?,?,?,?,?,?,?,datetime('now') WHERE NOT EXISTS(SELECT 1 FROM portfolio_projects WHERE repository_url=? OR project_url=?) ON CONFLICT(slug) DO NOTHING`).bind(project.title,project.slug,project.kind,project.description,project.url,project.image,project.image,project.challenge,project.solution,categorySlug,project.category,project.previously_public?1:0,project.previously_public?1:0,githubPortfolio.indexOf(project),`${project.title} — Hodges & Co. Studios`,project.description,project.repository,project.readme_sha,project.repository,project.repository)];
  });
  const result=await db.batch(statements);
  return {added:result.filter((_value,index)=>index%2===1).reduce((count,row)=>count+(row.meta.changes??0),0),preserved:githubPortfolio.length-pending.length};
}
