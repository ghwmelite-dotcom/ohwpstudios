import type { APIRoute } from 'astro';
export const prerender=false;
const json=(body:object,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
const TEXT_FIELDS=['title','slug','subtitle','description','client_name','project_url','featured_image','thumbnail_image','challenge','solution','results','project_date','completion_date','duration','metric_1_label','metric_1_value','metric_2_label','metric_2_value','metric_3_label','metric_3_value','metric_4_label','metric_4_value','meta_title','meta_description','repository_url'] as const;
const NUMBER_FIELDS=['category_id','is_featured','is_published','display_order'] as const;
type Value=string|number|null;
function parse(value:unknown):Record<string,Value>|null {
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const result:Record<string,Value>={};
 for(const [key,input]of Object.entries(value)){
  if(key==='id')continue;
  if((TEXT_FIELDS as readonly string[]).includes(key)){if(input!==null&&typeof input!=='string')return null;const text=typeof input==='string'?input.trim():null;if(text&&text.length>20000)return null;result[key]=text||null;}
  else if((NUMBER_FIELDS as readonly string[]).includes(key)){const n=input===null||input===''?null:Number(input);if(n!==null&&(!Number.isSafeInteger(n)||n<0||n>1000000))return null;if((key==='is_featured'||key==='is_published')&&n!==0&&n!==1)return null;result[key]=n;}
  else return null;
 }
 if(result.title!==undefined&&(typeof result.title!=='string'||result.title.length>180))return null;
 if(result.slug!==undefined&&(typeof result.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result.slug)||result.slug.length>180))return null;
 if(result.repository_url){try{const u=new URL(String(result.repository_url));if(u.protocol!=='https:'||u.hostname!=='github.com'||u.username||u.password||u.search||u.hash||!/^\/[^/]+\/[^/]+\/?$/.test(u.pathname))return null;}catch{return null;}}
 return result;
}
export const GET:APIRoute=async({request,locals})=>{
 const db=locals.runtime?.env?.DB;if(!db)return json({success:false,error:'Portfolio storage unavailable'},503);
 const url=new URL(request.url);const status=url.searchParams.get('status');const category=url.searchParams.get('category_id');const limit=url.searchParams.get('limit');
 const conditions:string[]=[];const params:Value[]=[];
 if(category){const id=Number(category);if(!Number.isSafeInteger(id)||id<1)return json({error:'Invalid category'},400);conditions.push('category_id=?');params.push(id);}
 if(status==='published')conditions.push('is_published=1');else if(status==='draft')conditions.push('is_published=0');else if(status==='featured')conditions.push('is_featured=1');
 let sql='SELECT * FROM portfolio_projects'+(conditions.length?' WHERE '+conditions.join(' AND '):'')+' ORDER BY display_order ASC,created_at DESC';
 if(limit){const count=Number(limit);if(!Number.isSafeInteger(count)||count<1)return json({error:'Invalid limit'},400);sql+=' LIMIT ?';params.push(Math.min(count,200));}
 try{const projects=await db.prepare(sql).bind(...params).all();const stats=await db.prepare('SELECT COUNT(*) AS total,SUM(is_published=1) AS published,SUM(is_featured=1) AS featured,(SELECT COUNT(*) FROM portfolio_categories) AS categories FROM portfolio_projects').first();return json({success:true,projects:projects.results??[],stats});}catch{return json({error:'Portfolio could not be loaded'},503);}
};
const save=(update:boolean):APIRoute=>async({request,locals})=>{
 let raw:unknown;try{raw=await request.json();}catch{return json({error:'Invalid JSON'},400);}
 const data=parse(raw);const id=raw&&typeof raw==='object'&&'id'in raw?Number(raw.id):0;
 if(!data||!Object.keys(data).length||(update&&(!Number.isSafeInteger(id)||id<1))||(!update&&!data.title))return json({success:false,error:'Use recognised project fields and a valid title'},400);
 const db=locals.runtime?.env?.DB;if(!db)return json({error:'Portfolio storage unavailable'},503);
 try{
  if(update&&!await db.prepare('SELECT id FROM portfolio_projects WHERE id=?').bind(id).first())return json({error:'Project not found'},404);
  if(!update){data.slug=data.slug||String(data.title).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');if(!data.slug)return json({error:'Choose a valid project URL slug'},400);data.is_published??=1;data.is_featured??=0;data.display_order??=0;}
  if(data.slug&&await db.prepare('SELECT id FROM portfolio_projects WHERE slug=? AND id<>?').bind(data.slug,update?id:0).first())return json({error:'That project URL is already in use'},409);
  // Identifiers come only from the fixed allowlists above; values are always bound.
  const entries=Object.entries(data);const names=entries.map(([name])=>name);const values=entries.map(([,value])=>value);
  const result=update?await db.prepare(`UPDATE portfolio_projects SET ${names.map(name=>name+'=?').join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(...values,id).run():await db.prepare(`INSERT INTO portfolio_projects(${names.join(',')}) VALUES(${names.map(()=>'?').join(',')})`).bind(...values).run();
  return json({success:true,id:update?id:result.meta.last_row_id},update?200:201);
 }catch{return json({success:false,error:'Project could not be saved'},503);}
};
export const POST=save(false);
export const PUT=save(true);
