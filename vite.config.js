import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // .claude holds session worktrees: whole copies of the repo and its tests.
    exclude: [...configDefaults.exclude, '.claude/**', 'dist/**'],
    setupFiles: ['./src/test-setup.js'],
    // The slowest DOM tests take ~2 s on a desktop; the 5 s default timed them
    // out on a busy machine, and the deploy gate runs on Vercel's builders.
    testTimeout: 15000,
    // Every core: the default (cores - 1) ran Vercel's 2-core builder on one.
    maxWorkers: '100%',
    // npm run test:coverage (the deploy gate runs it). The thresholds sit
    // just under the first run's 89.44 / 82.47 / 86.3 / 93.02 % (2026-10-27):
    // raise them as tests land; never lower them to get a deploy through.
    // Per-file report: npm run test:coverage -- --coverage.reporter=html
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/main.jsx', 'src/test-setup.js', 'src/octagon/fixtures/**'],
      reporter: ['text-summary'],
      thresholds: { statements: 89, branches: 82, functions: 86, lines: 92.5 },
    },
  },
})
