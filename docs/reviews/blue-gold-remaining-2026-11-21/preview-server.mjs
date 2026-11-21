import {createServer} from 'node:http';
const upstream='http://127.0.0.1:8802';
const project={id:9001,project_name:'Client workspace — design preview',project_type:'Web application',description:'Synthetic project data for reviewing the studio’s new client experience. No real client records are used.',status:'in_progress',budget:'GHS 24,000',progress_percentage:64,start_date:'2026-11-01',estimated_completion:'2026-12-18',updates:[{title:'Interface review ready',description:'The next design review is ready for your feedback.',update_type:'general',created_at:'2026-11-20',created_by:'Studio team'}],milestones:[{title:'Discovery and scope',description:'Requirements and project direction agreed.',status:'completed',due_date:'2026-11-07',completed_at:'2026-11-06'},{title:'Build and review',description:'Review the working interface and share feedback.',status:'in_progress',due_date:'2026-12-01'}],files:[{file_name:'Preview project brief.txt',file_url:'/preview-file.txt',uploaded_at:'2026-11-20',uploaded_by:'Studio team',category:'document'}],contracts:[]};
const json=(res,data,status=200)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data));};
createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1:8810');
 if(url.pathname==='/api/client/login'){
  let body='';for await(const chunk of req)body+=chunk;
  const credentials=JSON.parse(body||'{}');
  if(credentials.email!=='preview@example.com'||credentials.password!=='studio-preview')return json(res,{success:false,error:'Preview only: use preview@example.com and studio-preview.'},401);
  return json(res,{success:true,token:'local-design-preview-only',user:{id:9001,contact_name:'Preview reviewer',company_name:'Synthetic workspace',email:'preview@example.com'}});
 }
 if(url.pathname==='/api/client/projects')return json(res,{success:true,projects:[project]});
 if(url.pathname==='/api/client/project/9001')return json(res,{success:true,project});
 if(url.pathname==='/api/client/code-quality')return json(res,{success:true,metrics:{latest:null,deployments:[]}});
 if(url.pathname==='/api/client/pm-chat')return json(res,{success:true,messages:[],response:'This local design preview does not send messages. Your production messaging workflow is unchanged.'});
 if(url.pathname==='/api/page-init')return json(res,{success:true,data:{}});
 if(url.pathname==='/preview-file.txt'){res.writeHead(200,{'content-type':'text/plain'});return res.end('Synthetic design preview document. No client information.');}
 if(!['GET','HEAD'].includes(req.method))return json(res,{success:false,error:'Read-only design preview. No request was sent.'},503);
 const response=await fetch(upstream+req.url,{redirect:'manual'});
 const headers=Object.fromEntries(response.headers);delete headers['content-encoding'];delete headers['content-length'];delete headers['transfer-encoding'];delete headers.connection;headers['cache-control']='no-store';
 if(headers.location?.startsWith(upstream))headers.location=headers.location.replace(upstream,'http://127.0.0.1:8810');
 res.writeHead(response.status,headers);res.end(Buffer.from(await response.arrayBuffer()));
}catch(error){res.writeHead(502);res.end('Local preview unavailable.');}}).listen(8810,'127.0.0.1',()=>console.log('Read-only design preview: http://127.0.0.1:8810'));

