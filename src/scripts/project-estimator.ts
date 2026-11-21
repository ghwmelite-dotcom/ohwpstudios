export {};
import { downloadEstimatePDF } from './estimate-pdf';
import { telegramQuoteLink } from '../lib/quote-policy';
interface Estimate {
  estimated_timeline_weeks: number; pricing?: string;
  technology_stack?: string[]; summary?: string; ai_analysis?: { summary?: string };
  next_steps?: string[]; recommendations?: string[]; share_token?: string; message?: string;
  team_size_needed?: number; risk_level?: string;
}
const form = document.querySelector<HTMLFormElement>('#estimateForm');
const status = document.querySelector<HTMLParagraphElement>('#estimate-status');
const loading = document.querySelector<HTMLElement>('#estimate-loading');
const results = document.querySelector<HTMLElement>('#estimate-results');
let currentStep = 1;
let pending = false;
let currentEstimate:Estimate|undefined;
const steps = Array.from(document.querySelectorAll<HTMLElement>('.estimate-step'));
function showStep(step: number, focus = true) {
  if (currentStep === 1 && step === 2) window.ohwpTrack?.('estimator_started');
  currentStep = step;
  window.ohwpTrack?.('estimator_step', { step });
  steps.forEach((panel, index) => { panel.hidden = index + 1 !== step; });
  document.querySelectorAll<HTMLElement>('[data-progress]').forEach((item, index) => {
    if (index + 1 === step) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
  });
  if (focus) steps[step - 1]?.querySelector<HTMLElement>('h2')?.focus();
}
function validateStep(): boolean {
  const controls = steps[currentStep - 1]?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input,select,textarea');
  for (const control of controls || []) { if (!control.reportValidity()) return false; }
  return true;
}
document.querySelectorAll('[data-next]').forEach(button => button.addEventListener('click', () => { if (validateStep()) showStep(currentStep + 1); }));
document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => showStep(currentStep - 1)));
function setText(selector: string, value: string) { const element = document.querySelector(selector); if (element) element.textContent = value; }
function renderEstimate(data: Estimate) {
  currentEstimate=data;
  setText('#result-timeline', `${data.estimated_timeline_weeks} weeks`);
  setText('#result-team', data.team_size_needed ? `${data.team_size_needed} people` : 'To be scoped');
  setText('#result-risk', data.risk_level || 'To be reviewed');
  setText('#result-analysis', data.summary || data.ai_analysis?.summary || 'We’ll refine the approach in a conversation about your requirements.');
  const tech = document.querySelector('#result-tech');
  tech?.replaceChildren(...(data.technology_stack || []).map(item => { const span = document.createElement('span'); span.textContent = item; return span; }));
  const next = document.querySelector('#result-next');
  next?.replaceChildren(...(data.next_steps?.length ? data.next_steps : data.recommendations || ['Review this scope together and agree the essential first release.']).map(item => { const li = document.createElement('li'); li.textContent = item; return li; }));
  const share = document.querySelector<HTMLElement>('#share-proposal');
  if (share) share.hidden = !data.share_token;
  if (data.share_token && /^[a-zA-Z0-9-]+$/.test(data.share_token)) {
    const url = new URL(`/proposal/${data.share_token}`, location.origin).href;
    const input = document.querySelector<HTMLInputElement>('#proposal-url'); if (input) input.value = url;
    const link = document.querySelector<HTMLAnchorElement>('#open-proposal'); if (link) link.href = url;
    const telegram = document.querySelector<HTMLAnchorElement>('#telegram-quote'); if (telegram) telegram.href = telegramQuoteLink(url);
  }
}
form?.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form || !status || !loading || !results || pending) return;
  if (currentStep < 3) { if (validateStep()) showStep(currentStep + 1); return; }
  if (!validateStep()) return;
  pending = true; status.textContent = ''; form.hidden = true; loading.hidden = false;
  const data = Object.fromEntries(new FormData(form));
  data.project_description = `Engagement: ${String(data.engagement)}\n\n${String(data.project_description)}`;
  delete data.engagement;
  try {
    const response = await fetch('/api/estimate-project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: AbortSignal.timeout(60000) });
    const estimate: Estimate = await response.json();
    if (!response.ok || estimate.pricing !== 'review_required' || !Number.isFinite(estimate.estimated_timeline_weeks)) throw new Error('Invalid estimate');
    window.ohwpTrack?.('estimator_completed', { project_type:String(data.project_type || ''),budget_range:String(data.budget_range || '') });
    renderEstimate(estimate); results.hidden = false; document.querySelector<HTMLElement>('#result-title')?.focus();
  } catch {
    form.hidden = false; status.dataset.error = 'true'; status.textContent = 'We couldn’t prepare your scope. Your details are still here — try again, or contact ohwpstudios@gmail.com.'; status.focus();
  } finally { loading.hidden = true; pending = false; }
});
document.querySelector('#new-estimate')?.addEventListener('click', () => {
  if (!form || !results || !status) return;
  form.reset(); form.hidden = false; results.hidden = true; status.textContent = ''; showStep(1);
});
document.querySelector('#download-estimate')?.addEventListener('click', async () => {
  if(!currentEstimate || !form || !status) return;
  const button=document.querySelector<HTMLButtonElement>('#download-estimate');
  if(button) button.disabled=true;
  try { await downloadEstimatePDF(currentEstimate,String(new FormData(form).get('name')||'Your project')); }
  catch { status.textContent='The PDF could not be downloaded. Please retry or use Print / Save as PDF.'; }
  finally { if(button) button.disabled=false; }
});
document.querySelector('#print-estimate')?.addEventListener('click', () => window.print());
document.querySelector('#copy-proposal')?.addEventListener('click', async () => {
  const input = document.querySelector<HTMLInputElement>('#proposal-url');
  if (!input || !status) return;
  try { await navigator.clipboard.writeText(input.value); status.dataset.error = 'false'; status.textContent = 'Project brief link copied.'; }
  catch { input.focus(); input.select(); status.textContent = 'Select and copy the proposal link above.'; }
});
