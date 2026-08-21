import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/wordbound.css';
// Side-effect import: achievements.js is still the vanilla-engine's IIFE
// global-namespace module (window.Wordbound.Achievements), unmodified. It
// has no dependency on the rest of the engine, so it's safe to pull in on
// its own here rather than porting/rewriting it (GOALS.md STRUCTURAL step 2:
// "game logic stays framework-agnostic plain JS, import it from React").
import '../js/wordbound/achievements.js';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
