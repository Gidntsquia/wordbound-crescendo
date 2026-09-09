import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Relative base so the built output works when statically served from any
// path (itch.io zip, GitHub Pages project subpath, etc.) without extra config.
// outDir is dist/app (not bare dist/) so `vite build`'s emptyOutDir never
// collides with tools/build-itch.js's dist/wordbound-itch.zip.
//
// One entry: index.html -> src/sandbox/main.jsx. The former React app that
// lived at index.html was deleted 2026-09-07 (NEXT_LEVEL_PLAN.md stage 5);
// the ROUND SANDBOX is the app now.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    // Mirrors tsconfig.json's "@/*" -> "./src/*" path so shadcn-generated
    // primitives (which import via "@/ui/...") resolve at runtime too, not
    // just under tsc.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist/app',
  },
});
