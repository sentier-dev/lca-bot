import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/integration/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**', 'scripts/**'],
      exclude: [
        // Server components and route-level shells: exercised by the e2e suite.
        'src/app/**/layout.tsx',
        'src/app/**/page.tsx',
        'src/app/**/error.tsx',
        'src/app/**/not-found.tsx',
        'src/app/global-error.tsx',
        'src/instrumentation.ts',
        'src/components/layout/dev-perf-measure-guard.tsx',
        'src/components/layout/bfcache-reload.tsx',
        'scripts/render-icons.mjs',
        'src/db/index.ts',
        'src/db/schema/**',
        'src/types/**',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
