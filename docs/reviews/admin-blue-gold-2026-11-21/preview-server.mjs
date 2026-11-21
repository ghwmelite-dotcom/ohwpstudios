import {createServer} from 'node:http';
const upstream='http://127.0.0.1:8820';
const user={username:'Preview reviewer',csrf_token:'local-preview-csrf'};
const contact={id:9001,full_name:'Preview enquiry',name:'Preview enquiry',email:'preview@example.com',phone:'',company_name:'Synthetic studio brief',service_interested:'Software development',project_description:'Synthetic enquiry used only for reviewing the administration interface.',message:'Synthetic enquiry used only for reviewing the administration interface.',budget_range:'Discuss scope',timeline:'Flexible',status:'new',created_at:'2026-11-21 09:00:00'};
const portfolio=[{id:9001,title:'Preview studio project',subtitle:'Synthetic content for design review',slug:'preview-only',description:'A local example of a published project card. This data is not part of the production site.',category_id:1,featured_image:'/images/work/afrilab.jpg',is_published:1,is_featured:1,display_order:0,technologies:'React, Cloudflare',created_at:'2026-11-21'}];
const project={id:9001,project_name:'Preview client project',client_id:9001,client_name:'Preview client',company_name:'Preview client',project_type:'Web application',description:'Synthetic project for reviewing admin controls.',status:'in_progress',progress_percentage:64,budget:'GHS 24,000',created_at:'2026-11-01',start_date:'2026-11-01',estimated_completion:'2026-12-18'};
const theme={color_primary:'#2d438e',color_secondary:'#141d3a',color_accent:'#946b26',color_highlight:'#344c9e',font_heading:'Fraunces',font_body:'Segoe UI'};
function fixture(path){
 if(path==='/api/admin/session')return{success:true,...user};
 if(path==='/api/page-init')return{success:true,data:{}};
 if(path==='/api/theme')return{success:true,settings:theme,colorPresets:[{id:1,name:'Studio blue',primary_color:'#2d438e',secondary_color:'#141d3a',accent_color:'#946b26',highlight_color:'#344c9e'}],fontPresets:[{name:'Fraunces',google_font_name:'Fraunces'},{name:'Segoe UI',google_font_name:'Segoe UI'}]};
 if(path==='/api/admin/content')return{success:true,content:{hero_title:'Ambitious ideas. Beautifully built.',hero_subtitle:'Software, AI and trading technology. Built for you, or together.',hero_stat1_number:'',hero_stat1_label:'',hero_stat2_number:'',hero_stat2_label:'',hero_stat3_number:'',hero_stat3_label:'',site_name:'Hodges & Co. Studios',site_email:'preview@example.com',site_tagline:'Local admin design preview'}};
 if(path==='/api/admin/portfolio/categories')return{success:true,categories:[{id:1,name:'Software',slug:'software'}]};
 if(path==='/api/admin/portfolio')return{success:true,projects:portfolio,portfolio,stats:{total:1,published:1,featured:1,categories:1}};
 if(path==='/api/admin/portfolio/9001')return{success:true,project:portfolio[0]};
 if(path==='/api/admin/contacts')return{success:true,submissions:[contact],total:1};
 if(path==='/api/admin/contacts/9001')return{success:true,submission:contact,analytics:[]};
 if(path==='/api/admin/client-projects')return{success:true,projects:[project]};
 if(path==='/api/admin/clients')return{success:true,clients:[{id:9001,name:'Preview client',logo_url:'/brand/logo-on-light.svg',company_name:'Preview client',contact_name:'Preview reviewer',email:'preview@example.com',status:'active',created_at:'2026-11-21'}]};
 if(['/api/admin/contracts','/api/admin/contract-templates','/api/admin/contract-milestones'].includes(path))return[];
 return{success:true,services:[],posts:[],team:[],values:[],about:{},clients:[],users:[],projects:[],updates:[],milestones:[],files:[],estimates:[],applications:[],bookings:[],leads:[],testimonials:[],subscribers:[],subscriptions:[],notifications:[],conversations:[],messages:[],responses:[],conversation:null,metrics:{latest:null,deployments:[]},stats:{total:0,active:0,unread:0,today:0,verified:0,pending:0},total:0};
}
function json(res,data,status=200,extra={}){res.writeHead(status,{'content-type':'application/json','cache-control':'no-store',...extra});res.end(JSON.stringify(data));}
createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1:8821');
 const signed=(req.headers.cookie||'').includes('admin_design_preview=1');
 if(url.pathname==='/api/admin/login'){
  let body='';for await(const chunk of req)body+=chunk;const credentials=JSON.parse(body||'{}');
  if(credentials.username!=='preview'||credentials.password!=='studio-preview')return json(res,{success:false,error:'Local preview: use preview / studio-preview.'},401);
  return json(res,{success:true,...user},200,{'set-cookie':'admin_design_preview=1; Path=/; HttpOnly; SameSite=Lax'});
 }
 if(url.pathname==='/api/admin/logout')return json(res,{success:true},200,{'set-cookie':'admin_design_preview=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'});
 if(!['GET','HEAD'].includes(req.method))return json(res,{success:false,error:'Read-only design preview. No changes were sent or saved.'},503);
 if(url.pathname.startsWith('/api/')){
  if(url.pathname.startsWith('/api/admin/')&&!signed)return json(res,{success:false,error:'Unauthorized'},401);
  return json(res,fixture(url.pathname));
 }
 const headers={};if(signed)headers.cookie='admin_session=local-admin-design-review-only';
 const response=await fetch(upstream+req.url,{headers,redirect:'manual'});
 const out=Object.fromEntries(response.headers);for(const key of ['content-length','content-encoding','transfer-encoding','connection','set-cookie'])delete out[key];out['cache-control']='no-store';
 if(out.location?.startsWith(upstream))out.location=out.location.replace(upstream,'http://127.0.0.1:8821');
 res.writeHead(response.status,out);res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){res.writeHead(502);res.end('Local admin design preview unavailable.');}
}).listen(8821,'127.0.0.1',()=>console.log('Read-only admin design preview: http://127.0.0.1:8821/admin/login/'));
