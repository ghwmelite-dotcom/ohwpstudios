import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const [base,directory,phase] = process.argv.slice(2);
await mkdir(directory,{recursive:true});
const response = await fetch(base,{signal:AbortSignal.timeout(20000)});
if (!response.ok) throw new Error(`Homepage returned ${response.status}`);
const html = await response.text();
const links = [...new Set([...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].map(match=>{
  let link=match[1].replaceAll('&amp;','&');
  if(link.includes('/cdn-cgi/l/email-protection#')){
    const bytes=Buffer.from(link.split('#')[1],'hex');
    link='mailto:'+Buffer.from(bytes.subarray(1).map(byte=>byte^bytes[0])).toString();
  }
  return link;
}))].sort();
const baseline=join(directory,'baseline-destinations.json');
if(phase==='baseline') await writeFile(baseline,JSON.stringify(links,null,2));
const missing=JSON.parse(await readFile(baseline,'utf8')).filter(link=>!links.includes(link));
const paths=[...new Set(links.filter(link=>!link.startsWith('#')).map(link=>new URL(link,base)).filter(url=>url.origin===new URL(base).origin).map(url=>url.pathname))].sort();
const results=[];
for(let offset=0;offset<paths.length;offset+=6){
  results.push(...await Promise.all(paths.slice(offset,offset+6).map(async path=>{
    try{const res=await fetch(base+path,{signal:AbortSignal.timeout(20000)});await res.arrayBuffer();return{path,status:res.status};}
    catch(error){return{path,error:error.message};}
  })));
}
const report={base,anchors:links.length,missing,routes:results};
await writeFile(join(directory,`${phase}-links.json`),JSON.stringify(report,null,2));
const failed=results.filter(result=>result.status!==200);
console.log(JSON.stringify({anchors:links.length,routes:results.length,missing,failed}));
if(missing.length||failed.length) process.exitCode=1;
