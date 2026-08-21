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
  // Vitest + React Testing Library (GOALS.md STRUCTURAL sub-step 3): reads
  // this same config. jsdom environment + globals so RTL's automatic
  // afterEach cleanup (unmount between tests) kicks in without extra
  // wiring. setupFiles loads the vanilla engine modules once as side
  // effects (mirrors src/main.jsx's import order exactly) plus jest-dom's
  // matchers, so every test file gets a ready window.Wordbound.* without
  // repeating that boilerplate.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    include: ['src/**/*.test.{js,jsx}'],
  },
});
