import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __VERSION__: JSON.stringify('test') },
  test: {
    environment: 'happy-dom',
    environmentOptions: { happyDOM: { url: 'https://ex.com/posts/current/' } },
    include: ['test/unit/**/*.test.ts'],
    coverage: { include: ['src/**'] },
  },
});
