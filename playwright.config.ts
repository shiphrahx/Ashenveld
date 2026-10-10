import { defineConfig } from '@playwright/test'

const PORT = 4173

export default defineConfig({
  testDir: 'tests',
  testMatch: /.*\.spec\.ts/,
  timeout: 8 * 60_000,
  fullyParallel: true,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/Ashenveld/`,
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/Ashenveld/`,
    reuseExistingServer: !process.env.CI,
  },
})
