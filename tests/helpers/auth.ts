import { APIRequestContext, Page, expect } from '@playwright/test';
import { getEnv, urlApi } from './env';

/**
 * Les cookies d'authentification sont poses sur l'hote que l'application utilise reellement, qui
 * n'est pas forcement celui par lequel on est entre : sur staging, la redirection OAuth bascule
 * l'application sur le sous-domaine `www`. Si l'API visee est sur un autre hote, aucun cookie ne
 * lui est transmis et tous les appels repondent 401 — un symptome tres peu parlant.
 *
 * Les cookies ignorent le port, on compare donc les noms d'hote (front et API cohabitent sur
 * `localhost` avec des ports differents en local).
 */
const verifierCoherenceDesHotes = (page: Page): void => {
    const hoteApplication = new URL(page.url()).hostname;
    const hoteApi = new URL(urlApi('')).hostname;
    if (hoteApplication !== hoteApi) {
        throw new Error(
            `L'application repond sur « ${hoteApplication} » mais E2E_API_BASE_URL vise `
            + `« ${hoteApi} ». Les cookies de session ne seront pas transmis a l'API et tous les `
            + `appels authentifies echoueront en 401. Alignez E2E_BASE_URL et E2E_API_BASE_URL `
            + `sur le meme hote.`,
        );
    }
};

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
    verifierCoherenceDesHotes(page);
    return page.request;
};
