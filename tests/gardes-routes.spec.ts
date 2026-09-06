import { expect, test } from '@playwright/test';

// Depuis la centralisation des gardes dans <ProtectedRoute>, une route protegee ouverte
// sans session ne laisse plus l'utilisateur sur place avec un message : elle le renvoie
// vers la connexion. Ces cas negatifs n'etaient couverts par aucun test.
const ROUTES_PROTEGEES = ['/parametres', '/utilisateurs', '/adminCours', '/mesInscriptions'];

for (const route of ROUTES_PROTEGEES) {
    test(`un visiteur anonyme est redirige de ${route} vers la connexion`, async ({ page }) => {
        await page.goto(route);

        await page.waitForURL('**/login');
        await expect(page.getByTestId('username')).toBeVisible();
    });
}

test('les parcours publics restent accessibles sans session', async ({ page }) => {
    for (const route of ['/coursEnfants', '/coursAdultes', '/adhesions']) {
        await page.goto(route);

        await expect(page).toHaveURL(new RegExp(`${route}$`));
        await expect(page.getByTestId('se-connecter')).toBeVisible();
    }
});
