import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: [
    {
      command:
        "cd ../api && .venv/bin/python tests/e2e_seed.py && DATABASE_URL=sqlite:////tmp/elsewhere-e2e.db ADMIN_TOKEN=e2e-test-token-xxxxxxxxxxxxxxxxxxxxxxxx .venv/bin/uvicorn app.main:app --port 8100",
      url: "http://127.0.0.1:8100/health",
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command:
        "API_INTERNAL_URL=http://127.0.0.1:8100 npm run start -- --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
});
