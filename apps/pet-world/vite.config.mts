import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/pet-world',
  server: { host: '127.0.0.1', port: 4201, strictPort: true },
  preview: { host: '127.0.0.1', port: 4301, strictPort: true },
  build: { outDir: '../../dist/apps/pet-world', emptyOutDir: true },
  test: {
    name: 'pet-world',
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    passWithNoTests: false,
    restoreMocks: true,
    unstubGlobals: true,
  },
});
