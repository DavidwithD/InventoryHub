import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { API_PORT, API_URL, WEB_PORT } from './e2e/ports';

// The E2E run starts its own API and web server on separate ports.
// The API uses a new SQLite file for each run. Your dev servers and MySQL data are not touched.
const dbFile = path.join(__dirname, 'e2e', '.data', 'e2e.db');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // The reset runs before dotnet run. Playwright starts web servers before globalSetup.
      command: `node e2e/reset-db.mjs "${dbFile}" && dotnet run --project ../InventoryHub.API --no-launch-profile --urls http://localhost:${API_PORT}`,
      url: `${API_URL}/health`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        ASPNETCORE_ENVIRONMENT: 'E2E',
        ConnectionStrings__Sqlite: `Data Source=${dbFile}`,
        Cors__Origins__0: `http://localhost:${WEB_PORT}`,
      },
    },
    {
      command: `npx next dev --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: {
        NEXT_DIST_DIR: '.next-e2e',
        NEXT_PUBLIC_API_URL: API_URL,
      },
    },
  ],
});
