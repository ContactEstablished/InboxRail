import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

function App() {
  return (
    <>
      <header className="tab-strip">
        <span className="rail-mark">IR</span>
        <span className="tab-placeholder">Secure provider view</span>
      </header>
      <main>
        <p className="eyebrow">P0 feasibility spike</p>
        <h1>InboxRail</h1>
        <p>Packaged Electron Forge + Vite + TypeScript + React shell.</p>
      </main>
    </>
  );
}

const root = document.querySelector<HTMLDivElement>('#root');

if (!root) {
  throw new Error('Missing renderer root');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
