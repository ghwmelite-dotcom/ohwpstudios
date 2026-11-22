import type {APIRoute} from 'astro';
import {COVER_DISCIPLINES,renderRepositoryCover,type CoverDiscipline} from '../../../../../lib/repository-covers';
export const prerender=false;
export const GET:APIRoute=({params,url})=>{
 const match=params.cover?.match(/^([A-Za-z0-9_.-]{1,100})-([1-9][0-9]{0,15})$/);const discipline=url.searchParams.get('discipline');
 if(!match||!Number.isSafeInteger(Number(match[2]))||!COVER_DISCIPLINES.includes(discipline as CoverDiscipline))return new Response('Not found',{status:404,headers:{'Cache-Control':'no-store'}});
 return new Response(renderRepositoryCover(match[1],Number(match[2]),discipline as CoverDiscipline),{headers:{'Content-Type':'image/svg+xml; charset=utf-8','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
};
