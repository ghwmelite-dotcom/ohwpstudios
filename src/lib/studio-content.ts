export type StudioSection = 'home' | 'services' | 'about' | 'footer';
interface StudioField { key:string; label:string; section:StudioSection; value:string }
export const STUDIO_FIELDS:StudioField[] = [
  {key:'studio_hero_eyebrow',label:'Hero introduction',section:'home',value:'Independent minds. Accra roots. Global ambition.'},
  {key:'studio_hero_title',label:'Hero headline — use a line break between phrases',section:'home',value:'Ambitious ideas.\nBeautifully built.'},
  {key:'studio_hero_intro',label:'Hero description',section:'home',value:'Software, AI, and trading systems. Designed with intention. Engineered around the way you work.'},
  {key:'studio_hero_choice',label:'Two ways to work together',section:'home',value:'We build it for you. Or help you build it.'},
  {key:'studio_story_title',label:'Homepage studio heading',section:'home',value:'Rooted here.\nThinking beyond.'},
  {key:'studio_story_intro',label:'Homepage founder introduction',section:'home',value:'Led by Osborn “Ozzy” Hodges, founder of Hodges & Co., we bring a maker’s curiosity and an engineer’s discipline to every project.'},
  {key:'studio_story_context',label:'Homepage Ghanaian context',section:'home',value:'Our Ghanaian roots shape how we build: mobile money when it matters, care for slow connections, and software grounded in the lives of the people using it.'},
  {key:'studio_contact_title',label:'Homepage contact heading',section:'home',value:'What have you\ngot in mind?'},
  {key:'studio_contact_intro',label:'Homepage contact invitation',section:'home',value:'A new product. A better workflow. A trading idea. Or a project you’d love to build yourself. Tell us where you want to go.'},
  {key:'studio_services_intro',label:'Services introduction',section:'services',value:'From a first website to a complex platform. Bring the problem, the ambition, or the half-built project. We’ll help you find the way forward.'},
  {key:'studio_software_title',label:'Software discipline heading',section:'services',value:'Digital products.\nBuilt around people.'},
  {key:'studio_software_copy',label:'Software discipline description',section:'services',value:'Websites, mobile and desktop apps, SaaS products, business portals, APIs, and internal tools. From the first sketch to launch and ongoing care.'},
  {key:'studio_ai_title',label:'AI discipline heading',section:'services',value:'Artificial intelligence.\nPractical possibilities.'},
  {key:'studio_ai_copy',label:'AI discipline description',section:'services',value:'Assistants, knowledge tools, bots, and automation that connect your systems and take repetitive work off your hands. Built for a clear purpose.'},
  {key:'studio_trading_title',label:'Trading discipline heading',section:'services',value:'Trading technology.\nYour rules, engineered.'},
  {key:'studio_trading_copy',label:'Trading discipline description',section:'services',value:'MetaTrader bots for forex, metals, and indices. TradingView indicators, strategies, and alerts. With risk controls and testing built into the process.'},
  {key:'studio_guided_copy',label:'Guided build description',section:'services',value:'Turn AI coding tools into a real development practice. We help you plan, build, debug, review, and ship—with an experienced engineer helping you understand the decisions along the way.'},
  {key:'studio_about_badge',label:'About introduction',section:'about',value:'The studio / Accra, Ghana'},
  {key:'studio_about_title',label:'About headline',section:'about',value:'Good ideas deserve\nsomeone who can build.'},
  {key:'studio_about_description',label:'About lead paragraph',section:'about',value:'Curiosity across disciplines. Care in every detail. We turn ambitious ideas into useful software — and open the craft to people who want to learn it.'},
  {key:'studio_about_story_title',label:'About story heading',section:'about',value:'Rooted here.\nThinking beyond.'},
  {key:'studio_about_story_content',label:'About story — separate paragraphs with a blank line',section:'about',value:'Hodges & Co. Studios is led by Osborn M. D. K. Hodges — Ozzy — a Ghanaian technologist and founder of Hodges & Co. Limited. The studio brings together practical engineering, considered design, and a belief that technology should make everyday work better.\n\nExperience across public service, education, commerce, and trading shapes how we build: understand the people first, make the complex feel clear, and deliver something that works in the real world.\n\nOur Accra roots matter. Mobile money, slow connections, shared devices, and local ways of doing business are design inputs. The ambition travels: thoughtful software for clients here and everywhere.'},
  {key:'studio_footer_kicker',label:'Footer introduction',section:'footer',value:'A good idea deserves a great beginning.'},
  {key:'studio_footer_title',label:'Footer invitation heading',section:'footer',value:'Let’s build\nwhat’s next.'},
];
export const STUDIO_DEFAULTS:Record<string,string> = Object.fromEntries(STUDIO_FIELDS.map(field=>[field.key,field.value]));
export async function getStudioContent(db?:D1Database):Promise<Record<string,string>> {
  const content = {...STUDIO_DEFAULTS};
  if (!db) return content;
  try {
    const rows=await db.prepare("SELECT content_key,content_value FROM site_content WHERE content_key LIKE 'studio_%'").all<{content_key:string;content_value:string}>();
    for(const row of rows.results??[]) if(Object.hasOwn(content,row.content_key)&&typeof row.content_value==='string')content[row.content_key]=row.content_value;
  } catch { /* The approved copy remains available if CMS storage is unavailable. */ }
  return content;
}
export function validStudioContent(content:unknown):content is Record<string,string> {
  return !!content&&typeof content==='object'&&!Array.isArray(content)&&Object.entries(content).length<=100&&Object.entries(content).every(([key,value])=>Object.hasOwn(STUDIO_DEFAULTS,key)&&typeof value==='string'&&value.length<=10000);
}
