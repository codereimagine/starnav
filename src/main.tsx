import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/space-grotesk';
import { App } from './App';
import { PwaUpdateProvider } from './lib/PwaUpdate';

// Pin the full-screen layers to the REAL visible viewport height so mobile
// browser chrome (especially Chrome on iOS, with its bottom bar) can't leave a
// black strip at the bottom. CSS falls back to 100lvh before this runs.
const setVph = () => {
  const h = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty('--vph', `${h}px`);
};
setVph();
window.addEventListener('resize', setVph);
window.visualViewport?.addEventListener('resize', setVph);
window.addEventListener('orientationchange', setVph);

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('root element missing');

createRoot(rootEl).render(
  <StrictMode>
    <PwaUpdateProvider>
      <App />
    </PwaUpdateProvider>
  </StrictMode>
);
