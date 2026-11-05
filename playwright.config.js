import { defineConfig } from '@playwright/test';

const PUERTO = 3100;

export default defineConfig({
  testDir: 'tests/e2e',
  // Los dos proyectos comparten un servidor con datos que los tests modifican.
  workers: 1,
  fullyParallel: false,
  use: {
    browserName: 'chromium',
    baseURL: `http://127.0.0.1:${PUERTO}`,
    locale: 'es-ES',
  },
  projects: [
    { name: 'movil', use: { viewport: { width: 360, height: 740 } } },
    { name: 'portatil', use: { viewport: { width: 1366, height: 768 } } },
  ],
  webServer: {
    command: 'node tests/e2e/servidor-e2e.js',
    url: `http://127.0.0.1:${PUERTO}/acceso`,
    env: { PORT: String(PUERTO) },
    reuseExistingServer: false,
  },
});
