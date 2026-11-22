import type {D1Database} from '@cloudflare/workers-types';
import {syncWeeklyPortfolio} from '../../src/lib/portfolio-sync';
export default {
 async scheduled(controller:{scheduledTime:number},env:{DB:D1Database}){
  const result=await syncWeeklyPortfolio(env.DB,new Date(controller.scheduledTime));
  console.log(JSON.stringify({event:'weekly_portfolio_sync',...result}));
  if(result.status==='failed')throw Error(`Portfolio sync failed: ${result.code}`);
 },
 async fetch(){return new Response('Not found',{status:404});},
};
