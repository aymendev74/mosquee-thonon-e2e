import { APIRequestContext, test as teardown } from '@playwright/test';
import { contexteApiAdmin } from '../helpers/auth';
import { ecrireParametres } from '../helpers/prepareEnv';
import { E2E_PREFIX, readRunState } from '../helpers/testData';

type LigneInscription = { idInscription: number };
type LigneAdhesion = { id: number };
type LigneUtilisateur = { id: number; email: string };

/**
 * Forme exacte des adresses generees par la suite (cf. testData.ts). On ne supprime un compte
 * que s'il correspond a ce motif : le domaine example.com est reserve par la RFC 2606, aucune
 * adresse reelle ne peut donc etre emportee par erreur.
 */
const EMAIL_E2E = /^e2e-[a-z]+-[a-z0-9]+@example\.com$/;

/**
 * Le champ `nom` de toutes les donnees creees porte le prefixe E2E-, et la recherche back filtre
 * en `LIKE %nom%` : un seul appel par type suffit, et il ramasse au passage les residus d'un run
 * precedent qui aurait ete interrompu avant son nettoyage.
 */
const supprimerInscriptions = async (api: APIRequestContext, type: 'ENFANT' | 'ADULTE'): Promise<number> => {
    const reponse = await api.get('v1/inscriptions', { params: { nom: E2E_PREFIX, type } });
    if (!reponse.ok()) {
        throw new Error(`Recherche des inscriptions ${type} - HTTP ${reponse.status()}`);
    }
    const lignes: LigneInscription[] = await reponse.json();
    const ids = Array.from(new Set(lignes.map((ligne) => ligne.idInscription)));
    if (ids.length === 0) {
        return 0;
    }
    const suppression = await api.delete('v1/inscriptions', { data: ids });
    if (!suppression.ok()) {
        throw new Error(`Suppression des inscriptions ${type} - HTTP ${suppression.status()} : ${await suppression.text()}`);
    }
    return ids.length;
};

const supprimerAdhesions = async (api: APIRequestContext): Promise<number> => {
    const reponse = await api.get('v1/adhesions', { params: { nom: E2E_PREFIX } });
    if (!reponse.ok()) {
        throw new Error(`Recherche des adhesions - HTTP ${reponse.status()}`);
    }
    const lignes: LigneAdhesion[] = await reponse.json();
    const ids = Array.from(new Set(lignes.map((ligne) => ligne.id)));
    if (ids.length === 0) {
        return 0;
    }
    const suppression = await api.delete('v1/adhesions', { data: ids });
    if (!suppression.ok()) {
        throw new Error(`Suppression des adhesions - HTTP ${suppression.status()} : ${await suppression.text()}`);
    }
    return ids.length;
};

/**
 * Creer une inscription cree ou rattache un compte utilisateur sur l'adresse du run. Ces comptes
 * survivraient a la suppression de l'inscription et s'accumuleraient a chaque execution.
 *
 * A appeler apres la suppression des inscriptions : `deleteUser` cascade sur les inscriptions du
 * compte (`deleteByIdUtilisateur`), ce qui serait redondant ici, et se protege du cas vide.
 */
const supprimerComptes = async (api: APIRequestContext): Promise<number> => {
    const reponse = await api.get('v1/users', { params: { email: 'e2e-' } });
    if (!reponse.ok()) {
        throw new Error(`Recherche des comptes de test - HTTP ${reponse.status()}`);
    }
    const utilisateurs: LigneUtilisateur[] = await reponse.json();
    const cibles = utilisateurs.filter((utilisateur) => EMAIL_E2E.test(utilisateur.email ?? ''));

    for (const cible of cibles) {
        const suppression = await api.delete(`v1/users/${cible.id}`);
        if (!suppression.ok()) {
            throw new Error(`Suppression du compte ${cible.email} - HTTP ${suppression.status()} : ${await suppression.text()}`);
        }
    }
    return cibles.length;
};

/**
 * Rend l'environnement dans l'etat ou la suite l'a trouve : la base de dev comme le staging sont
 * partages et persistants.
 *
 * Supprimer les inscriptions et adhesions purge aussi leurs demandes de mail : les services de
 * suppression appellent `mailRequestRepository.deleteByTypeAndBusinessIdIn` avant de supprimer
 * l'entite. Restaurer SEND_EMAIL_ENABLED est donc sans danger, d'autant que le job de mail vide
 * toute la file a chaque cycle et bascule les demandes en IGNORED - statut terminal - tant que
 * l'envoi est coupe : rien ne peut repartir plus tard.
 */
teardown('nettoie les donnees et restaure les parametres', async () => {
    const api = await contexteApiAdmin();
    try {
        const enfants = await supprimerInscriptions(api, 'ENFANT');
        const adultes = await supprimerInscriptions(api, 'ADULTE');
        const adhesions = await supprimerAdhesions(api);
        const comptes = await supprimerComptes(api);
        console.log(`Nettoyage : ${enfants} inscription(s) enfant, ${adultes} adulte(s), ${adhesions} adhesion(s), ${comptes} compte(s) supprime(s).`);

        const { paramsAvantRun } = readRunState();
        await ecrireParametres(api, paramsAvantRun);
        console.log(`Parametres restaures : ${JSON.stringify(paramsAvantRun)}`);
    } finally {
        await api.dispose();
    }
});
