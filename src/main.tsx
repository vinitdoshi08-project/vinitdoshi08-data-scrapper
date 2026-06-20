import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Hide the logo loader once React has mounted
const loader = document.getElementById('app-loader');
if (loader) {
  loader.classList.add('hidden');
  setTimeout(() => loader.remove(), 350);
}
