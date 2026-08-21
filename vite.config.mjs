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
  },
});
