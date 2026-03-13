import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Development hot-reload: poll index.html for changes and refresh the side panel in-place
if (import.meta.env.DEV) {
  let lastContent: string | null = null;
  setInterval(async () => {
    try {
      const resp = await fetch(location.href);
      const text = await resp.text();
      if (lastContent !== null && text !== lastContent) {
        location.reload();
      }
      lastContent = text;
    } catch {
      // ignore
    }
  }, 1000);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
