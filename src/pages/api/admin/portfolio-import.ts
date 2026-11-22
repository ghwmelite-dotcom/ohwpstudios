import type { APIRoute } from 'astro';
import { importRepositoryPortfolio } from '@/lib/portfolio-import';
export const prerender=false;
// Existing admin session and central CSRF checks guard this mutation.
export const POST:APIRoute=async({locals})=>{
  const db=locals.runtime?.env?.DB;if(!db)return Response.json({error:'Portfolio storage unavailable'},{status:503});
  try{return Response.json({success:true,...await importRepositoryPortfolio(db)},{headers:{'Cache-Control':'no-store'}});}
  catch(error){console.error('Repository import failed:',error instanceof Error?error.message:'Unknown import failure');return Response.json({error:'The curated projects could not be imported. Check repository visibility and storage, then retry. Existing projects were preserved.'},{status:503,headers:{'Cache-Control':'no-store'}});}
};
