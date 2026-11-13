import { expect, test } from 'vitest';

test('loads the TypeScript entry point through the test runner', async () => {
  const entryPoint = await import('../src/index.ts');

  expect(entryPoint).toBeTypeOf('object');
});
