import { APIRequestContext, Page, expect } from '@playwright/test';
import { getEnv } from './env';

/**
 * Connexion par l'interface, donc via le vrai flux OAuth2/PKCE de l'application.
 *
 * Renvoie le contexte API du navigateur : il partage le stockage de cookies avec la page, et
 * porte donc la session qui vient d'être établie. On ne recrée pas un contexte API séparé à
 * partir d'un `storageState` — ce transfert s'est révélé ne transmettre aucun cookie en
 * environnement HTTPS, et les appels partaient en 401.
 */
export const seConnecterAdmin = async (page: Page): Promise<APIRequestContext> => {
    await page.goto('/login');
    await page.getByTestId('username').fill(getEnv('E2E_USER'));
    await page.getByTestId('password').fill(getEnv('E2E_PASSWORD'));
    await page.getByTestId('connect').click();
    await page.waitForURL('**/admin');
    await expect(page.getByTestId('nav-parametres')).toBeVisible();
    return page.request;
};
