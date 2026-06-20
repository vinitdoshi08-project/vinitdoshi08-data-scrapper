import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Record when the page started loading
const pageStart = (window as any).__loaderStart ?? Date.now();
const MIN_DISPLAY_MS = 900; // loader shows for at least this long

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Hide loader only after minimum display time has passed
function hideLoader() {
  const loader = document.getElementById('app-loader');
  if (!loader) return;
  const elapsed = Date.now() - pageStart;
  const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
  setTimeout(() => {
    loader.classList.add('hidden');
    // Remove from DOM after fade-out transition (400ms)
    setTimeout(() => loader.remove(), 450);
  }, remaining);
}

// Use requestAnimationFrame to wait until React has actually painted
requestAnimationFrame(() => requestAnimationFrame(hideLoader));
