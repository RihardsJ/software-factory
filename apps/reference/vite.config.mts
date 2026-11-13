import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/apps/reference',
  server: { host: '127.0.0.1', port: 4200, strictPort: true },
  preview: { host: '127.0.0.1', port: 4300, strictPort: true },
  build: { outDir: '../../dist/apps/reference', emptyOutDir: true },
  test: {
    name: 'reference',
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    passWithNoTests: false,
    restoreMocks: true,
    unstubGlobals: true,
  },
});
