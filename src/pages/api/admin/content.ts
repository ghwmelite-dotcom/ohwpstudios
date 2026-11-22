import type { APIRoute } from 'astro';
import { STUDIO_DEFAULTS } from '@/lib/studio-content';
import { SITE_CONFIG } from '@/config';
export const prerender = false;
const defaults:Record<string,string> = {...STUDIO_DEFAULTS, hero_title:STUDIO_DEFAULTS.studio_hero_title,hero_subtitle:STUDIO_DEFAULTS.studio_hero_intro,site_name:SITE_CONFIG.name,site_tagline:SITE_CONFIG.tagline,site_email:SITE_CONFIG.email,site_phone:SITE_CONFIG.phone,site_logo:'/brand/hodges-co-studios-mark.svg',site_favicon:'/brand/hodges-co-studios-mark.svg',social_twitter:SITE_CONFIG.social.twitter,social_linkedin:SITE_CONFIG.social.linkedin,social_github:SITE_CONFIG.social.github,social_instagram:SITE_CONFIG.social.instagram,footer_copyright:'Hodges & Co. Studios. A studio of Hodges & Co. Limited.'};
const json=(body:object,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export const GET:APIRoute=async({locals})=>{
 const db=locals.runtime?.env?.DB as D1Database|undefined;
 const content={...defaults};
 if(db){const rows=await db.prepare('SELECT content_key,content_value FROM site_content').all<{content_key:string;content_value:string}>();for(const row of rows.results??[])content[row.content_key]=row.content_value;}
 return json({success:true,content,source:db?'database':'default'});
};
export const POST:APIRoute=async({request,locals})=>{
 let content:unknown;
 try{const body:unknown=await request.json();content=body&&typeof body==='object'?'content' in body?body.content:undefined:undefined;}catch{return json({error:'Invalid JSON'},400);}
 if(!content||typeof content!=='object'||Array.isArray(content)||Object.entries(content).length>100||Object.entries(content).some(([key,value])=>!Object.hasOwn(defaults,key)||typeof value!=='string'||value.length>10000))return json({error:'Use recognised content fields and text under 10,000 characters'},400);
 const db=locals.runtime?.env?.DB as D1Database|undefined;
 if(!db)return json({error:'Content storage is unavailable'},503);
 const entries=Object.entries(content) as [string,string][];
 if(entries.length)await db.batch(entries.map(([key,value])=>db.prepare("INSERT INTO site_content(content_key,content_value,content_type,updated_at) VALUES (?,?,'text',datetime('now')) ON CONFLICT(content_key) DO UPDATE SET content_value=excluded.content_value,updated_at=excluded.updated_at").bind(key,value)));
 return json({success:true,content,persisted:true});
};
