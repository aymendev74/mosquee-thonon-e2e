import { expect, test } from '@playwright/test';
import { choisirOption, remplirDate, remplirTexte } from './helpers/antd';
import { seConnecterAdmin } from './helpers/auth';
import { donneesInscriptionEnfant } from './helpers/testData';

/**
 * Parcours complet d'une inscription enfant : creation publique puis reprise par un
 * administrateur. Les deux tests sont volontairement dependants — le second modifie
 * l'inscription creee par le premier — d'ou le mode serie.
 */
test.describe.serial('Inscription enfant', () => {

    test('un visiteur peut creer une inscription', async ({ page }) => {
        const donnees = donneesInscriptionEnfant();
        await page.goto('/coursEnfants');

        // Etape 1 : responsable legal
        await remplirTexte(page, 'responsableLegal.nom', donnees.nom);
        await remplirTexte(page, 'responsableLegal.prenom', donnees.prenom);
        await remplirTexte(page, 'responsableLegal.numeroEtRue', donnees.numeroEtRue);
        await remplirTexte(page, 'responsableLegal.codePostal', donnees.codePostal);
        await remplirTexte(page, 'responsableLegal.ville', donnees.ville);
        await remplirTexte(page, 'responsableLegal.mobile', donnees.mobile);
        await remplirTexte(page, 'responsableLegal.email', donnees.email);
        await remplirTexte(page, 'confirmationEmail', donnees.email);
        await remplirTexte(page, 'responsableLegal.nomAutre', donnees.nomAutre);
        await remplirTexte(page, 'responsableLegal.prenomAutre', donnees.prenomAutre);
        await remplirTexte(page, 'responsableLegal.lienParente', donnees.lienParente);
        await remplirTexte(page, 'responsableLegal.telephoneAutre', donnees.telephoneAutre);
        await page.getByTestId('responsableLegal.autorisationAutonomie-OUI').check();
        await page.getByTestId('responsableLegal.autorisationMedia-OUI').check();
        await page.getByTestId('suivant-responsable-legal').click();

        // Etape 2 : eleves. Le formulaire de saisie est deja ouvert a l'arrivee sur l'etape
        // (Eleves.tsx force editingIndex a 0), il n'y a donc pas de bouton « Ajouter » a cliquer.
        await remplirTexte(page, 'nomEleve', donnees.eleve.nom);
        await remplirTexte(page, 'prenomEleve', donnees.eleve.prenom);
        await remplirDate(page, 'dateNaissanceEleve', donnees.eleve.dateNaissance);
        await choisirOption(page, 'niveauScolaire', 'CE1');
        await page.getByTestId('enregistrer-eleve').click();
        await page.getByTestId('suivant-eleves').click();

        // Etape 3 : tarif et consentement
        await page.getByTestId('consentement').check();
        await page.getByTestId('valider-inscription').click();

        const resultat = page.getByTestId('inscription-result');
        await expect(resultat).toBeVisible();
        // LISTE_ATTENTE reste acceptable (periode pleine sur l'environnement cible), mais REFUSE
        // signalerait que la priorite aux reinscriptions est restee active.
        await expect(page.getByTestId('inscription-result-REFUSE')).toHaveCount(0);
    });

    test.describe('reprise par un administrateur', () => {
        test('un administrateur peut modifier et sauver l\'inscription', async ({ page }) => {
            const donnees = donneesInscriptionEnfant();
            await seConnecterAdmin(page);
            await page.getByTestId('nav-coursArabes').click();
            await page.getByTestId('nav-adminCoursEnfants').click();

            // La recherche back filtre en LIKE : le nom de l'eleve, unique au run, isole la ligne.
            await remplirTexte(page, 'nom', donnees.eleve.nom);
            await page.getByTestId('rechercher').click();

            const boutonModifier = page.locator('[testid^="modifier-inscription-"]');
            await expect(boutonModifier, `Inscription ${donnees.eleve.nom} introuvable dans la liste admin`)
                .toHaveCount(1);
            await boutonModifier.click();

            await expect(page.getByTestId('responsableLegal.ville')).toHaveValue(donnees.ville);
            await remplirTexte(page, 'responsableLegal.ville', donnees.villeModifiee);

            await page.getByTestId('suivant-responsable-legal').click();
            await page.getByTestId('suivant-eleves').click();
            await page.getByTestId('valider-inscription').click();

            await page.waitForURL('**/adminCours');

            // Re-ouvrir la fiche pour confirmer que la modification est bien persistee.
            await remplirTexte(page, 'nom', donnees.eleve.nom);
            await page.getByTestId('rechercher').click();
            await expect(boutonModifier).toHaveCount(1);
            await boutonModifier.click();
            await expect(page.getByTestId('responsableLegal.ville')).toHaveValue(donnees.villeModifiee);
        });

        // Regression : l'ajout d'un eleve a une inscription existante provoquait une violation
        // NOT NULL sur eleve.idtari (pre-flush Hibernate pendant la recherche du tarif).
        test("un administrateur peut ajouter un eleve a l'inscription", async ({ page }) => {
            const donnees = donneesInscriptionEnfant();
            await seConnecterAdmin(page);
            await page.getByTestId('nav-coursArabes').click();
            await page.getByTestId('nav-adminCoursEnfants').click();

            await remplirTexte(page, 'nom', donnees.eleve.nom);
            await page.getByTestId('rechercher').click();
            const boutonModifier = page.locator('[testid^="modifier-inscription-"]');
            await expect(boutonModifier).toHaveCount(1);
            await boutonModifier.click();

            await page.getByTestId('suivant-responsable-legal').click();

            // En modification, Eleves.tsx ouvre le formulaire sur l'eleve 0 (champs vides) : on le
            // referme pour faire apparaitre le bouton « Ajouter un eleve ».
            await page.getByTestId('annuler-eleve').click();
            await page.getByTestId('ajouter-eleve').click();
            await remplirTexte(page, 'nomEleve', donnees.eleve2.nom);
            await remplirTexte(page, 'prenomEleve', donnees.eleve2.prenom);
            await remplirDate(page, 'dateNaissanceEleve', donnees.eleve2.dateNaissance);
            await choisirOption(page, 'niveauScolaire', 'CP');
            await page.getByTestId('enregistrer-eleve').click();
            await expect(page.locator('[testid^="modifier-eleve-"]')).toHaveCount(2);

            await page.getByTestId('suivant-eleves').click();
            await page.getByTestId('valider-inscription').click();
            await page.waitForURL('**/adminCours');

            // Re-ouvrir la fiche : les deux eleves doivent etre persistes.
            await remplirTexte(page, 'nom', donnees.eleve.nom);
            await page.getByTestId('rechercher').click();
            await expect(boutonModifier).toHaveCount(1);
            await boutonModifier.click();
            await page.getByTestId('suivant-responsable-legal').click();
            await expect(page.locator('[testid^="modifier-eleve-"]')).toHaveCount(2);
            await expect(page.getByText(donnees.eleve2.nom)).toBeVisible();
        });
    });
});
