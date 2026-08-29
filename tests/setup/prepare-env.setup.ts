import { test as setup } from '@playwright/test';
import { ADMIN_STORAGE_STATE } from '../helpers/env';
import { contexteApiAdmin, seConnecterAdmin } from '../helpers/auth';
import {
    garantirPeriodeEtTarifs,
    lireParametres,
    ouvrirLesInscriptions,
    verifierTarifsAdhesion,
} from '../helpers/prepareEnv';
import { nouveauSuffixe, writeRunState } from '../helpers/testData';

/**
 * Prepare l'environnement cible avant toute execution. Sans ces prerequis, les formulaires
 * publics ne s'affichent meme pas : le parametre d'ouverture des inscriptions conditionne leur
 * rendu, et le calcul du tarif exige une periode active couvrant la date du jour.
 *
 * La preparation passe par l'API plutot que par les ecrans d'administration : la saisie d'une
 * periode et d'une grille de seize montants a chaque run serait longue et fragile pour un simple
 * prerequis. La verification de l'ecran Parametres, elle, reste un test d'interface a part
 * entiere (parametres.spec.ts).
 */
setup('prepare l\'environnement de test', async ({ page }) => {
    await seConnecterAdmin(page);
    await page.context().storageState({ path: ADMIN_STORAGE_STATE });

    const api = await contexteApiAdmin();
    try {
        // Memorise l'etat d'origine : le teardown restaure ces valeurs a la fin du run.
        const paramsAvantRun = await lireParametres(api);
        writeRunState({ suffix: nouveauSuffixe(), paramsAvantRun });

        await ouvrirLesInscriptions(api);
        await garantirPeriodeEtTarifs(api, 'COURS_ENFANT');
        await garantirPeriodeEtTarifs(api, 'COURS_ADULTE');
        await verifierTarifsAdhesion(api);
    } finally {
        await api.dispose();
    }
});
