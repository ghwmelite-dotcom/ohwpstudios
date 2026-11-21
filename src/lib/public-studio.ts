export interface StudioClient { id:number; name:string; logo_url:string|null; website_url:string|null; industry:string|null; description:string|null; project_type:string|null; is_featured:number }
export interface StudioCase { id:number; title:string; client_name:string; industry:string|null; challenge:string|null; solution:string|null; results:string|null; tech_stack:string|null; project_duration:string|null; team_size:number|null; image_url:string|null; testimonial:string|null; testimonial_author:string|null; testimonial_role:string|null; metrics:string|null }
export async function getStudioClients(db:D1Database):Promise<StudioClient[]> {
  const result=await db.prepare(`SELECT id,name,logo_url,website_url,industry,description,project_type,is_featured FROM clients WHERE status = 'active' ORDER BY is_featured DESC,display_order ASC,created_at DESC`).all<StudioClient>();
  return result.results ?? [];
}
export async function getStudioCases(db:D1Database):Promise<StudioCase[]> {
  // Migration 006 inserted these fictional demonstration clients. Retain the CMS flow without publishing its seed content.
  const demos=['StyleHub','MediCare Plus','NeoBank'];
  const result=await db.prepare(`SELECT id,title,client_name,industry,challenge,solution,results,tech_stack,project_duration,team_size,image_url,testimonial,testimonial_author,testimonial_role,metrics FROM case_studies WHERE published = 1 AND client_name NOT IN (?,?,?) ORDER BY featured DESC,created_at DESC`).bind(...demos).all<StudioCase>();
  return result.results ?? [];
}
