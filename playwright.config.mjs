import { defineConfig } from '@playwright/test';

const inspectorUrl = 'http://127.0.0.1:6284';

export default defineConfig({
  testDir: './test/e2e',
  testMatch: '*.spec.mjs',
  workers: 1,
  use: {
    baseURL: inspectorUrl,
    browserName: 'chromium',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: './node_modules/.bin/mcp-inspector node src/index.mjs',
    url: `${inspectorUrl}/healthz`,
    env: {
      CLIENT_PORT: '6284',
      MCP_SANDBOX_PORT: '6285',
      MCP_APP_ORIGIN_PORT: '6288',
      MCP_INSPECTOR_SECRET_STORE: 'memory',
      MCP_AUTO_OPEN_ENABLED: 'false',
    },
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
