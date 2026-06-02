import { defineConfig } from 'vite';

// Relative base so the build works both at the domain root and when served
// from a GitHub Pages project subpath (https://<user>.github.io/gamecore/).
export default defineConfig({
  base: './',
  server: { host: true },
});
