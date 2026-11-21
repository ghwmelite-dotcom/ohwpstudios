import { track } from '../lib/analytics';
window.ohwpTrack = track;
// Bind delegated controls before loading optional observability dependencies.
// This also survives a replaced navigation element after a page transition.
document.addEventListener('click',event=>{
  if (!(event.target instanceof Element) || !event.target.closest('[data-theme-toggle]')) return;
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('theme',theme); } catch {}
});
interface InstallPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{outcome:string}> }
let prompt: InstallPrompt | undefined;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event as InstallPrompt;});
document.addEventListener('click',async event=>{
  if (!(event.target instanceof Element) || !event.target.closest('[data-install-app]')) return;
  const status = document.querySelector('.install-status');
  if (prompt) { await prompt.prompt(); await prompt.userChoice; prompt=undefined; }
  else if (status) status.textContent = 'Use your browser’s Install app or Add to Home Screen option when available.';
});
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(registration=>registration.update()).catch(()=>{});
}
if (import.meta.env.PUBLIC_SENTRY_DSN) {
  import('../lib/sentry-client').then(({initSentry})=>initSentry()).catch(()=>{});
}
