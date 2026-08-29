import { expect, test } from '@playwright/test';
import { getEnv } from './helpers/env';

test('un administrateur peut se connecter puis se deconnecter', async ({ page }) => {
    await page.goto('/');

    // Le header public et le formulaire portent tous deux le libelle « Se connecter » :
    // on passe par les testid pour lever l'ambiguite.
    await page.getByTestId('se-connecter').click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByTestId('username').fill(getEnv('E2E_USER'));
    await page.getByTestId('password').fill(getEnv('E2E_PASSWORD'));
    await page.getByTestId('connect').click();

    await page.waitForURL('**/admin');
    await expect(page.getByTestId('nav-parametres')).toBeVisible();

    await page.getByTestId('avatar-utilisateur').click();
    await page.getByTestId('menu-logout').click();

    await expect(page.getByTestId('se-connecter')).toBeVisible();
});

test('un mot de passe errone laisse sur le formulaire', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('username').fill(getEnv('E2E_USER'));
    await page.getByTestId('password').fill('mot-de-passe-invalide');
    await page.getByTestId('connect').click();

    await expect(page.getByText('Identifiants incorrects')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
});
