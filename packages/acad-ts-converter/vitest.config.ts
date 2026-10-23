import { defineConfig } from 'vitest/config'

// Node environment on purpose: the workingDatabase self-binding fix (HANDOFF
// §5.1) is specifically about working headless — no viewer pre-binding. If a
// future data-model release starts touching browser globals, switch this to
// 'jsdom' (and add the dep); the regression assertions below stay the same.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    // Tests import the built lib (`../lib/index.js`) to exercise the published
    // artifact shape; Vite's resolver handles its extensionless internal imports.
    testTimeout: 30000
  }
})
