import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { applyDocumentTheme } from './lib/theme';
import App from './App.jsx';

applyDocumentTheme();
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
