import { expect, test } from '@playwright/test';
import { choisirOption, remplirDate, remplirTexte } from './helpers/antd';
import { donneesInscriptionAdulte } from './helpers/testData';

test('un visiteur peut creer une inscription adulte', async ({ page }) => {
    const donnees = donneesInscriptionAdulte();
    await page.goto('/coursAdultes');

    await remplirTexte(page, 'nom', donnees.nom);
    await remplirTexte(page, 'prenom', donnees.prenom);
    await remplirDate(page, 'dateNaissance', donnees.dateNaissance);
    await page.getByTestId('sexe-M').check();
    await choisirOption(page, 'niveauInterne', 'Débutant');
    await choisirOption(page, 'statutProfessionnel', 'Etudiant');
    await remplirTexte(page, 'numeroEtRue', donnees.numeroEtRue);
    await remplirTexte(page, 'codePostal', donnees.codePostal);
    await remplirTexte(page, 'ville', donnees.ville);
    await remplirTexte(page, 'mobile', donnees.mobile);
    await remplirTexte(page, 'email', donnees.email);
    await remplirTexte(page, 'confirmationEmail', donnees.email);

    // Les matieres proviennent de l'API : leurs codes ne sont pas connus a l'avance, on prend
    // la premiere bascule proposee.
    const matieres = page.locator('[testid^="matieres-"]');
    await expect(matieres.first(), 'Aucune matiere adulte proposee par l\'API').toBeVisible();
    await matieres.first().click();

    await page.getByTestId('consentement').check();
    await page.getByTestId('valider-inscription').click();

    await expect(page.getByTestId('inscription-result')).toBeVisible();
});
