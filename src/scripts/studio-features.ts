import { track } from '../lib/analytics';
import { initSentry } from '../lib/sentry-client';
window.ohwpTrack = track;
initSentry();
document.querySelector('[data-theme-toggle]')?.addEventListener('click',()=>{
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('theme',theme); } catch {}
});
interface InstallPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{outcome:string}> }
let prompt: InstallPrompt | undefined;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();prompt=event as InstallPrompt;});
document.querySelector('[data-install-app]')?.addEventListener('click',async()=>{
  const status = document.querySelector('.install-status');
  if (prompt) { await prompt.prompt(); await prompt.userChoice; prompt=undefined; }
  else if (status) status.textContent = 'Use your browser’s Install app or Add to Home Screen option when available.';
});
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(registration=>registration.update()).catch(()=>{});
}
