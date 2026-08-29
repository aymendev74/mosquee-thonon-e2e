import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
dotenv.config({
  path: path.resolve(__dirname, '.env'),
});

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /**
   * Les tests partagent la base de l'environnement cible (dev en local, staging en CI) et le
   * setup positionne des paramètres globaux : toute parallélisation les ferait se marcher dessus.
   */
  fullyParallel: false,
  workers: 1,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Les parcours d'inscription enchaînent plusieurs étapes et appels réseau. */
  timeout: 60000,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: process.env.E2E_BASE_URL,

    trace: 'retain-on-failure',

    headless: true,

    testIdAttribute: 'testid',
  },

  projects: [
    /**
     * Prépare l'environnement (paramètres, période tarifaire, tarifs) et enregistre la session
     * admin. `teardown` garantit le nettoyage même si des tests échouent.
     */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /.*\.teardown\.ts/,
    },
    {
      /**
       * Aucun état d'authentification partagé : les parcours publics s'exécutent anonymes et les
       * tests d'administration se connectent eux-mêmes via `seConnecterAdmin`.
       */
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
});
