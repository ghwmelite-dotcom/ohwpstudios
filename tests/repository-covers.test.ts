import {expect,test} from 'bun:test';
import {COVER_DISCIPLINES,coverDiscipline,renderRepositoryCover,repositoryCoverUrl} from '../src/lib/repository-covers';
import {GET} from '../src/pages/images/work/repositories/v1/[cover].svg';
test('covers have stable unique identities and materially different domain illustrations',()=>{
 const one=repositoryCoverUrl({id:1,name:'AgroTrust',description:'Farm credit platform'});const two=repositoryCoverUrl({id:2,name:'CivicLens',description:'Government platform'});
 expect(one).not.toBe(two);expect(one).toContain('discipline=agriculture');expect(two).toContain('discipline=civic');
 expect(renderRepositoryCover('AgroTrust',1,'agriculture')).toBe(renderRepositoryCover('AgroTrust',1,'agriculture'));
 const images=COVER_DISCIPLINES.map(kind=>renderRepositoryCover('Project',1,kind));expect(new Set(images).size).toBe(COVER_DISCIPLINES.length);expect(new Set(COVER_DISCIPLINES.map(kind=>images[COVER_DISCIPLINES.indexOf(kind)].match(/<g transform[\s\S]*<\/g>/)?.[0])).size).toBe(COVER_DISCIPLINES.length);
 expect(renderRepositoryCover('Project',1,'ai')).not.toBe(renderRepositoryCover('Project',2,'ai'));
});
test('repository themes are grounded in public metadata, not fabricated outcomes',()=>{
 expect(coverDiscipline('aevrium-biosystems','Microfluidics for health')).toBe('health');expect(coverDiscipline('AI-Football-Predictions-App')).toBe('sport');expect(coverDiscipline('chatsage','Market signal analyst for forex trading')).toBe('trading');expect(coverDiscipline('claude-skills','AI engineering skills')).toBe('software');expect(coverDiscipline('Akwaaba-School')).toBe('education');expect(coverDiscipline('AgroTrust','Food security and farmer credit')).toBe('agriculture');expect(coverDiscipline('claude-skills','MQL5 trading systems')).toBe('software');
 const svg=renderRepositoryCover('Trading-Tool',3,'trading');expect(svg).toContain('not a product screenshot');expect(svg).not.toMatch(/profit|accuracy|100%|customers|endorsement/i);
});
test('public image endpoint never reads CMS data and rejects hostile parameters',async()=>{
 const context=(cover:string,discipline:string)=>({params:{cover},url:new URL('https://ohwpstudios.org/images/work/repositories/v1/'+cover+'.svg?discipline='+encodeURIComponent(discipline)),locals:{}}) as Parameters<typeof GET>[0];
 const response=await GET(context('AgroTrust-1','agriculture'));expect(response.status).toBe(200);expect(response.headers.get('content-type')).toContain('image/svg+xml');expect(response.headers.get('cache-control')).toContain('immutable');expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
 for(const [name,kind]of [['<script>-1','ai'],['Name-1','<script>'],['Name-9007199254740992','ai'],['Name-0','ai']])expect((await GET(context(name,kind))).status).toBe(404);
 const svg=await response.text();expect(svg).not.toMatch(/<script|<foreignObject|\son\w+=|<image|https?:\/\/(?!www\.w3\.org)/i);
 expect(()=>renderRepositoryCover('<script>',1,'ai')).toThrow();
});
