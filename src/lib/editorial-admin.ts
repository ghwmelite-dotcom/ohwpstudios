export function editorialFailureMessage(code:string):string {
  const labels:Record<string,string>={
    invalid_model_output:'The AI response did not meet the required article format.',
    model_embedded_structure:'The AI placed code or article structure inside the prose; the draft was rejected.',
    model_json_invalid:'The AI response was not valid structured article data.',
    model_response_too_large:'The AI response exceeded the safe size limit.',
    model_title_invalid:'The AI returned an invalid or overlong article title.',
    model_excerpt_invalid:'The AI returned an invalid article summary.',
    model_seo_title_invalid:'The AI returned an invalid search title.',
    model_seo_description_invalid:'The AI returned an invalid search description.',
    model_answer_invalid:'The AI returned an invalid opening answer.',
    model_section_paragraphs_invalid:'The article paragraphs did not meet the content requirements.',
    model_section_sources_invalid:'The AI used an invalid reference identifier.',
    model_faq_answer_invalid:'An FAQ answer did not meet the content requirements.',
    article_length_outside_limits:'The draft was too short or too long for the editorial requirements.',
    duplicate_search_intent:'The proposed article was too similar to existing content.',
    repetitive_article:'The proposed article repeated the same paragraphs.',
    workers_ai_failed:'Cloudflare AI could not complete the request.',
    draft_storage_failed:'The draft could not be saved safely.',
  };
  return Object.hasOwn(labels,code)?labels[code]:'The draft did not pass its checks. Review the run details before retrying.';
}
interface RunView { week_key:string;status:string;attempt_count:number;post_id:number|null;post_title:string|null;post_published:number|null;source_notes:string;review_notes:string;error_code:string|null;word_count:number|null }
interface StatusView { enabled:boolean;schedule:string;next_run:string;model:string;review:string;runs:RunView[] }
export function initEditorialPanel(csrf:()=>string, refreshPosts:()=>Promise<void>, editPost:(id:number)=>Promise<void>):()=>Promise<void> {
  const status=document.getElementById('editorial-schedule-status');
  const runs=document.getElementById('editorial-runs');
  const generate=document.getElementById('editorial-generate') as HTMLButtonElement|null;
  const toggle=document.getElementById('editorial-toggle') as HTMLButtonElement|null;
  let enabled=false,busy=false;
  const element=<K extends keyof HTMLElementTagNameMap>(tag:K,text:string)=>{const node=document.createElement(tag);node.textContent=text;return node;};
  async function load() {
    if(!status||!runs||!generate||!toggle)return;
    try {
      const response=await fetch('/api/admin/editorial-automation');if(!response.ok)throw new Error('Workflow unavailable');
      const data:StatusView=await response.json();enabled=data.enabled;
      status.textContent=`${enabled?'Active':'Paused'} · ${data.schedule} · Next scheduled slot: ${new Date(data.next_run).toLocaleString('en-GB',{timeZone:'Africa/Accra'})} Accra. Model: ${data.model}.`;
      toggle.textContent=enabled?'Pause weekly drafts':'Resume weekly drafts';generate.disabled=busy||!enabled;toggle.disabled=busy;
      runs.replaceChildren();
      if(!data.runs.length)runs.append(element('p','No weekly runs yet. The first scheduled run will create a draft here, or use the button above.'));
      for(const run of data.runs){
        const article=document.createElement('article');
        article.append(element('h4',`${run.week_key} · ${run.status==='draft'?(run.post_published?'Published manually':'Draft ready for review'):run.status} · attempt ${run.attempt_count}/2`));
        if(run.post_title)article.append(element('p',run.post_title));
        if(run.word_count)article.append(element('p',`${run.word_count} words · ${run.review_notes}`));
        if(run.error_code)article.append(element('p',`No draft was saved. ${editorialFailureMessage(run.error_code)} ${run.attempt_count<2?'You may retry this weekly slot.':'The two-attempt limit has been reached; review the workflow before the next scheduled slot.'}`));
        if(run.status==='draft'&&!run.post_id)article.append(element('p','The linked post was deleted. This completed weekly slot will not regenerate automatically.'));
        if(run.post_id){const button=element('button','Review article');button.className='btn btn-secondary';button.type='button';button.addEventListener('click',()=>editPost(run.post_id!));article.append(button);}
        const detail=document.createElement('details');detail.append(element('summary','Sources and review checklist'));detail.append(element('p',run.review_notes||data.review));
        try {
          const notes:unknown=JSON.parse(run.source_notes);
          if(Array.isArray(notes))for(const note of notes){if(!note||typeof note!=='object'||typeof note.url!=='string'||typeof note.title!=='string')continue;const url=new URL(note.url);if(url.protocol!=='https:')continue;const p=document.createElement('p');const a=element('a',note.title);a.href=url.href;a.target='_blank';a.rel='noopener noreferrer';p.append(a,document.createTextNode(` · fetched ${String(note.fetched_at??'')} · SHA-256 ${String(note.sha256??'')}`));detail.append(p);}
        } catch { detail.append(element('p','Source details unavailable; verify references in the draft.')); }
        article.append(detail);runs.append(article);
      }
    } catch {status.textContent='Weekly editorial setup is unavailable. Existing blog editing and publishing remain available.';generate.disabled=true;toggle.disabled=true;}
  }
  async function act(action:'generate'|'pause'|'resume') {
    if(busy||!status||!generate||!toggle)return;busy=true;generate.disabled=true;toggle.disabled=true;status.textContent=action==='generate'?'Preparing a source-backed draft with Cloudflare Workers AI. This can take a minute…':'Updating weekly workflow…';
    let message='';
    try {
      const response=await fetch('/api/admin/editorial-automation',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf()},body:JSON.stringify({action})});
      const result=await response.json();
      if(!response.ok)message=result.code?`No new draft was saved. ${editorialFailureMessage(result.code)}`:`Run did not create a new draft: ${result.error||'check its details below'}.`;
      else if(action==='generate')message=result.status==='draft'?'New draft saved. Review it below before publishing.':result.status==='existing'?'This week’s draft already exists; it was preserved.':result.status==='paused'?'Weekly generation is paused.':'A generation run is already in progress.';
      else message=action==='pause'?'Weekly draft generation paused.':'Weekly draft generation resumed.';
      await refreshPosts();
    } catch {message='Request interrupted. Refresh the run list before retrying; the weekly slot prevents duplicate drafts.';}
    finally {busy=false;await load();if(status&&message)status.prepend(document.createTextNode(message+' '));}
  }
  generate?.addEventListener('click',()=>act('generate'));
  toggle?.addEventListener('click',()=>act(enabled?'pause':'resume'));
  return load;
}
