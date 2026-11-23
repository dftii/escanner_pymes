import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/** Tests contra webs reales (badssl.com, google.com). Necesitan Internet. */
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['tests/network/**/*.test.ts'],
    testTimeout: 30_000,
  },
});
