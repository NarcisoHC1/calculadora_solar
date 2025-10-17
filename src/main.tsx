// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

console.log('[boot] main.tsx starting');

try {
  const rootEl = document.getElementById('root');
  if (!rootEl) throw new Error('No se encontró #root en index.html');

  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );

  console.log('[boot] React render OK');
} catch (err: any) {
  console.error('[boot] FATAL', err);
  const el = document.getElementById('boot-error');
  if (el) {
    el.setAttribute('style', 'display:block');
    el.textContent = 'FATAL boot error:\n' + (err?.stack || String(err));
  }
}
