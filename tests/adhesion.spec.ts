import { expect, test } from '@playwright/test';
import { choisirOption, choisirPremiereOption, remplirDate, remplirTexte } from './helpers/antd';
import { donneesAdhesion } from './helpers/testData';

test('un visiteur peut creer une adhesion', async ({ page }) => {
    const donnees = donneesAdhesion();
    await page.goto('/adhesions');

    await choisirOption(page, 'titre', 'Monsieur');
    await remplirTexte(page, 'nom', donnees.nom);
    await remplirTexte(page, 'prenom', donnees.prenom);
    await remplirDate(page, 'dateNaissance', donnees.dateNaissance);
    await remplirTexte(page, 'numeroEtRue', donnees.numeroEtRue);
    await remplirTexte(page, 'codePostal', donnees.codePostal);
    await remplirTexte(page, 'ville', donnees.ville);
    await remplirTexte(page, 'mobile', donnees.mobile);
    await remplirTexte(page, 'email', donnees.email);
    await remplirTexte(page, 'confirmationEmail', donnees.email);

    // Les cotisations proposees dependent des tarifs ADHESION en base : on prend la premiere,
    // qui est un montant fixe et n'ouvre donc pas le champ « Montant » libre.
    const cotisation = await choisirPremiereOption(page, 'idTarif');
    expect(cotisation, 'La premiere cotisation ne doit pas etre le montant libre').not.toEqual('Autre');

    await page.getByTestId('consentement').check();
    await page.getByTestId('valider-adhesion').click();

    await expect(page.getByTestId('adhesion-result')).toBeVisible();
});
