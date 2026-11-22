import { sanitizeHTML } from '@/utils/sanitize';
export interface BlogInput {title:string;slug:string;excerpt:string;content:string;featured_image:string|null;author:string;published:number;seo_title:string;seo_description:string;tags:string}
export function parseBlogInput(input:unknown):BlogInput|null {
  if(!input||typeof input!=='object'||Array.isArray(input))return null;
  const data=input as Record<string,unknown>;
  const text=(key:string,max:number)=>typeof data[key]==='string'?String(data[key]).trim().slice(0,max):'';
  const title=text('title',180),content=sanitizeHTML(text('content',100000));
  const slug=(text('slug',150)||title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')).toLowerCase();
  const image=text('featured_image',2048);
  if(!title||!content||!/^\w+(?:-\w+)*$/.test(slug)||slug.includes('_')||!['undefined','boolean','number'].includes(typeof data.published)||![undefined,true,false,0,1].includes(data.published as undefined|boolean|number))return null;
  if(image){try{const url=new URL(image,'https://ohwpstudios.org');if(!['https:','http:'].includes(url.protocol)||image.startsWith('//'))return null;}catch{return null;}}
  const excerpt=text('excerpt',600);
  return {title,slug,excerpt,content,featured_image:image||null,author:text('author',120)||'Hodges & Co. Studios',published:data.published?1:0,seo_title:text('seo_title',180)||title,seo_description:text('seo_description',320)||excerpt.slice(0,160),tags:text('tags',500)};
}
