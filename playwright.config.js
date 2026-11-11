import { defineConfig } from '@playwright/test';

const PUERTO = 3100;
// El portal del paciente (002) tiene su propio servidor, con el reloj de los ejemplos de su spec.
const PUERTO_PORTAL = 3101;
const PRUEBAS_PORTAL = /portal-.*\.spec\.js/;

export default defineConfig({
  testDir: 'tests/e2e',
  // Los proyectos comparten servidores con datos que los tests modifican.
  workers: 1,
  fullyParallel: false,
  use: {
    browserName: 'chromium',
    baseURL: `http://127.0.0.1:${PUERTO}`,
    locale: 'es-ES',
  },
  projects: [
    { name: 'movil', testIgnore: PRUEBAS_PORTAL, use: { viewport: { width: 360, height: 740 } } },
    { name: 'portatil', testIgnore: PRUEBAS_PORTAL, use: { viewport: { width: 1366, height: 768 } } },
    {
      name: 'portal-movil',
      testMatch: PRUEBAS_PORTAL,
      use: { viewport: { width: 360, height: 740 }, baseURL: `http://127.0.0.1:${PUERTO_PORTAL}` },
    },
    {
      name: 'portal-portatil',
      testMatch: PRUEBAS_PORTAL,
      use: { viewport: { width: 1366, height: 768 }, baseURL: `http://127.0.0.1:${PUERTO_PORTAL}` },
    },
  ],
  webServer: [
    {
      command: 'node tests/e2e/servidor-e2e.js',
      url: `http://127.0.0.1:${PUERTO}/acceso`,
      env: { PORT: String(PUERTO) },
      reuseExistingServer: false,
    },
    {
      command: 'node tests/e2e/servidor-portal-e2e.js',
      url: `http://127.0.0.1:${PUERTO_PORTAL}/acceso`,
      env: { PORT: String(PUERTO_PORTAL) },
      reuseExistingServer: false,
    },
  ],
});
