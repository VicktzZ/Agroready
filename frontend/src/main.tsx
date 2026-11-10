import '@fontsource-variable/plus-jakarta-sans/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import { App } from './App';
import { AuthProvider } from './auth';
import './styles.css';
import { ToastProvider } from './ui';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
);
