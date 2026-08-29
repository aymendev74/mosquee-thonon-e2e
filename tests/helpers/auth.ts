import { APIRequestContext, Page, expect, request } from '@playwright/test';
import { ADMIN_STORAGE_STATE, getEnv } from './env';

/**
 * Connexion par l'interface, donc via le vrai flux OAuth2/PKCE de l'application. Le cookie
 * `MOTH-TOKEN` déposé sur le path `/api` sert ensuite aussi bien au navigateur qu'au contexte
 * API : inutile de réimplémenter l'échange de jetons côté tests.
 */
export const seConnecterAdmin = async (page: Page): Promise<void> => {
    await page.goto('/login');
    await page.getByTestId('username').fill(getEnv('E2E_USER'));
    await page.getByTestId('password').fill(getEnv('E2E_PASSWORD'));
    await page.getByTestId('connect').click();
    await page.waitForURL('**/admin');
    await expect(page.getByTestId('nav-parametres')).toBeVisible();
};

/**
 * Contexte API portant la session admin enregistrée par le setup.
 *
 * Playwright résout les URLs avec `new URL(chemin, baseURL)` : un chemin commençant par « / »
 * repartirait de la racine du domaine et écraserait le préfixe `/api`. On force donc le slash
 * final sur la base, et les appels doivent utiliser des chemins **relatifs** (`v1/params`).
 */
export const contexteApiAdmin = async (): Promise<APIRequestContext> =>
    request.newContext({
        baseURL: getEnv('E2E_API_BASE_URL').replace(/\/?$/, '/'),
        storageState: ADMIN_STORAGE_STATE,
    });
