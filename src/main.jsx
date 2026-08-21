import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../css/wordbound.css';
// Side-effect imports: achievements.js and characters.js are still the
// vanilla-engine's IIFE global-namespace modules (window.Wordbound.*),
// unmodified. Neither has a dependency on the rest of the engine, so it's
// safe to pull them in on their own here rather than porting/rewriting them
// (GOALS.md STRUCTURAL step 2: "game logic stays framework-agnostic plain
// JS, import it from React").
import '../js/wordbound/achievements.js';
import '../js/wordbound/characters.js';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
