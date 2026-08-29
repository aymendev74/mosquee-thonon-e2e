import { Page, expect } from '@playwright/test';

/**
 * Adaptateurs pour les composants antd, dont le `testid` n'atterrit pas toujours sur l'élément
 * que l'on veut piloter. Les règles suivies par le front sont documentées dans
 * `src/components/common/*FormItem.tsx` :
 *  - Input / Select / Switch  → `testid` sur l'élément lui-même
 *  - InputNumber              → `testid` sur le wrapper, l'input est en dessous
 *  - DatePicker               → pas de `testid`, on cible l'`id` DOM
 *  - RadioGroup / MultiTag    → un `testid` par option, suffixé par la valeur
 */

/** Format attendu par les DatePicker de l'application (APPLICATION_DATE_FORMAT). */
export const FORMAT_DATE = 'DD.MM.YYYY';

export const remplirTexte = async (page: Page, testid: string, valeur: string): Promise<void> => {
    await page.getByTestId(testid).fill(valeur);
};

/** Le `testid` d'un InputNumber porte sur le wrapper : on descend jusqu'à l'input réel. */
export const remplirNombre = async (page: Page, testid: string, valeur: string): Promise<void> => {
    await page.getByTestId(testid).locator('input').fill(valeur);
};

/** Les DatePicker exposent un `id` DOM et non un `testid` (cf. DatePickerFormItem). */
export const remplirDate = async (page: Page, id: string, valeur: string): Promise<void> => {
    const champ = page.locator(`#${id}`);
    await champ.fill(valeur);
    await champ.press('Enter');
};

export const choisirOption = async (page: Page, testid: string, libelle: string): Promise<void> => {
    await page.getByTestId(testid).click();
    await page.locator('.ant-select-dropdown:visible .ant-select-item-option')
        .filter({ hasText: libelle })
        .first()
        .click();
};

/** Sélectionne la première option disponible, quand son libellé dépend des données. */
export const choisirPremiereOption = async (page: Page, testid: string): Promise<string> => {
    await page.getByTestId(testid).click();
    const option = page.locator('.ant-select-dropdown:visible .ant-select-item-option').first();
    await option.waitFor({ state: 'visible' });
    const libelle = (await option.textContent()) ?? '';
    await option.click();
    return libelle.trim();
};

/** antd rend un Switch comme un <button role="switch" aria-checked>. */
export const lireInterrupteur = async (page: Page, testid: string): Promise<boolean> =>
    (await page.getByTestId(testid).getAttribute('aria-checked')) === 'true';

export const attendreInterrupteur = async (page: Page, testid: string, attendu: boolean): Promise<void> => {
    await expect(page.getByTestId(testid)).toHaveAttribute('aria-checked', String(attendu));
};

export const definirInterrupteur = async (page: Page, testid: string, valeur: boolean): Promise<void> => {
    if ((await lireInterrupteur(page, testid)) !== valeur) {
        await page.getByTestId(testid).click();
    }
    await attendreInterrupteur(page, testid, valeur);
};
