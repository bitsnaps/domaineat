import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['tests/setup/jsdom.ts'],
    include: ['tests/**/*.spec.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      reportsDirectory: './coverage',
      // Track all source files — not just ones imported by tests
      all: true,
      include: [
        'src/**/*.{ts,vue}',
        'api/models/**/*.ts',
        'netlify/functions/**/*.ts',
      ],
      exclude: [
        'src/vite-env.d.ts',
        'src/**/*.d.ts',
        'src/main.ts',
        'api/config/**',
        'api/migrations/**',
        'api/migrate.ts',
        'api/seeders/**',
        'netlify/functions/_shared/**',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
      // Thresholds — will increase over time
      thresholds: {
        lines: 30,
        functions: 25,
        branches: 20,
        statements: 30,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '#': fileURLToPath(new URL('./src/stores', import.meta.url)),
    },
  },
})
