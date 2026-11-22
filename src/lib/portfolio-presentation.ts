import type { D1Database } from '@cloudflare/workers-types';
import { selectedWork } from '../data/selected-work';
import { githubPortfolio } from '../data/github-portfolio';
import { getPublicProjects, getPublicProject, publicUrl, type PublicProject } from './public-portfolio';
export interface PortfolioPresentation {slug:string;title:string;category:string;kind:string;description:string;image:string;url:string|null;repository:string|null;challenge:string;solution:string;results:string;capabilities:string[];illustration:boolean;featured:boolean}
function fallback():PortfolioPresentation[]{return selectedWork.map(project=>({...project,results:'',illustration:false,featured:true}));}
function present(project:PublicProject):PortfolioPresentation {
  const source=githubPortfolio.find(item=>item.slug===project.slug);
  const image=publicUrl(project.featured_image)||'';
  return {slug:project.slug,title:project.title,category:project.category_name||source?.category||'Software project',kind:project.subtitle||source?.kind||'Project study',description:project.description||'',image,url:publicUrl(project.project_url)||null,repository:publicUrl(project.repository_url)||null,challenge:project.challenge||'',solution:project.solution||'',results:project.results||'',capabilities:source?.capabilities||[],illustration:image.includes('/work/studies/'),featured:project.is_featured===1};
}
export async function portfolioPresentation(db?:D1Database):Promise<PortfolioPresentation[]> {
  if(!db)return fallback();
  try {
    const published=await getPublicProjects(db);
    // Explicit drafts hide their corresponding fallback. Absent records retain approved work.
    const slugs=selectedWork.map(project=>project.slug);
    const managed=(await db.prepare(`SELECT slug FROM portfolio_projects WHERE slug IN (${slugs.map(()=>'?').join(',')})`).bind(...slugs).all<{slug:string}>()).results;
    return [...published.map(present),...fallback().filter(project=>!managed.some(row=>row.slug===project.slug))];
  } catch {return [];}
}
export async function portfolioDetail(db:D1Database|undefined,slug:string):Promise<PortfolioPresentation|undefined> {
  const approved=fallback().find(project=>project.slug===slug);
  if(!db)return approved;
  try {
    const published=await getPublicProject(db,slug);
    if(published)return present(published);
    const managed=await db.prepare('SELECT id FROM portfolio_projects WHERE slug=?').bind(slug).first();
    return managed?undefined:approved;
  } catch {return undefined;}
}
