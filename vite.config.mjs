import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the built output works when statically served from any
// path (itch.io zip, GitHub Pages project subpath, etc.) without extra config.
// outDir is dist/app (not bare dist/) so `vite build`'s emptyOutDir never
// collides with tools/build-itch.js's dist/wordbound-itch.zip.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist/app',
    // Two entries: the real app (index.html) and the bare-bones one-fight
    // duel sandbox (sandbox.html -> src/sandbox/). The sandbox exists so the
    // duel mechanics can be tuned without loading the whole run structure;
    // see src/sandbox/DuelSandbox.jsx's header.
    rollupOptions: {
      input: {
        main: 'index.html',
        sandbox: 'sandbox.html',
      },
    },
  },
});
