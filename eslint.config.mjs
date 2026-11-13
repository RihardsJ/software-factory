import js from '@eslint/js';
import nx from '@nx/eslint-plugin';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// Nx publishes rule types for an older ESLint context. Register only its runtime rules.
const nxPlugin = /** @type {import('eslint').ESLint.Plugin} */ (
  /** @type {unknown} */ ({ rules: nx.rules })
);

export default defineConfig(
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '.nx/**', '.specify/**', '.agents/**'] },
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['apps/**/*.ts', 'libs/**/*.ts', 'tools/**/*.ts'],
    plugins: { '@nx': nxPlugin },
    rules: {
      '@nx/enforce-module-boundaries': ['error', {
        allow: [],
        depConstraints: [
          { sourceTag: 'type:app', onlyDependOnLibsWithTags: ['type:lib'] },
          { sourceTag: 'type:lib', onlyDependOnLibsWithTags: ['type:lib'] },
          { sourceTag: 'type:tool', onlyDependOnLibsWithTags: ['type:tool', 'type:lib'] },
          { sourceTag: 'runtime:browser', notDependOnLibsWithTags: ['runtime:node'] },
          { sourceTag: 'runtime:node', notDependOnLibsWithTags: ['runtime:browser'] },
          { sourceTag: 'runtime:neutral', onlyDependOnLibsWithTags: ['runtime:neutral'] },
        ],
      }],
    },
  },
);
