import { expect, test } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from './helpers/env';
import { attendreInterrupteur } from './helpers/antd';
import { analyserDate, aujourdHui } from './helpers/dates';

test.use({ storageState: ADMIN_STORAGE_STATE });

test.describe('Écran Paramètres', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/admin');
        await page.getByTestId('nav-parametres').click();
        await expect(page.getByRole('heading', { name: "Paramètres de l'application" })).toBeVisible();
    });

    test("l'envoi d'e-mails est désactivé", async ({ page }) => {
        // Garde-fou central de la suite : tant que ce paramètre vaut false, le job de mail
        // bascule les demandes en IGNORED et aucun SMTP n'est sollicité.
        await attendreInterrupteur(page, 'sendMailEnabled', false);

        const carteEmails = page.locator('.ant-card').filter({ hasText: 'Paramètres généraux' }).first();
        await expect(carteEmails.getByText('Inactif')).toBeVisible();
    });

    test('les inscriptions enfant et adulte sont ouvertes', async ({ page }) => {
        await attendreInterrupteur(page, 'inscriptionEnfantEnabled', true);
        await attendreInterrupteur(page, 'inscriptionAdulteEnabled', true);
        await attendreInterrupteur(page, 'reinscriptionPrioritaire', false);

        // Les DatePicker exposent un id DOM et non un testid (cf. DatePickerFormItem).
        for (const id of ['inscriptionEnfantEnabledFromDate', 'inscriptionAdulteEnabledFromDate']) {
            const valeur = await page.locator(`#${id}`).inputValue();
            expect(valeur, `La date ${id} doit être renseignée`).not.toEqual('');
            expect(analyserDate(valeur).getTime(), `La date ${id} doit être passée`)
                .toBeLessThanOrEqual(aujourdHui().getTime());
        }
    });
});
