import { RUN_STATE_FILE } from './env';
import { ParametresApplicatifs } from './prepareEnv';
import fs from 'fs';
import path from 'path';

/**
 * Préfixe porté par le champ `nom` de toutes les données créées par la suite. La recherche
 * back-end filtre en `LIKE %nom%`, ce qui permet au teardown de retrouver — et de supprimer —
 * aussi bien les données du run courant que les résidus d'un run précédent interrompu.
 */
export const E2E_PREFIX = 'E2E-';

export type RunState = {
    suffix: string;
    /** Valeurs des paramètres applicatifs avant le run, restaurées par le teardown. */
    paramsAvantRun: ParametresApplicatifs;
};

export const readRunState = (): RunState => JSON.parse(fs.readFileSync(RUN_STATE_FILE, 'utf-8'));

export const writeRunState = (state: RunState): void => {
    fs.mkdirSync(path.dirname(RUN_STATE_FILE), { recursive: true });
    fs.writeFileSync(RUN_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
};

/** Identifiant unique du run, injecté dans les noms et e-mails pour éviter toute collision. */
export const nouveauSuffixe = (): string => Date.now().toString(36).toUpperCase();

/**
 * Playwright charge tous les fichiers de test avant d'exécuter le projet `setup` : le fichier
 * d'état du run n'existe donc pas encore au moment de l'import. Les jeux de données sont
 * construits à la première utilisation, depuis le corps d'un test, puis mémorisés pour que deux
 * tests d'un même parcours manipulent bien la même inscription.
 */
const memoiser = <T>(construire: (suffix: string) => T): (() => T) => {
    let valeur: T | undefined;
    return () => (valeur ??= construire(readRunState().suffix));
};

const commun = (suffix: string, role: string) => ({
    numeroEtRue: '12 rue des Tests',
    codePostal: '74200',
    ville: 'Thonon-les-Bains',
    // Doit satisfaire validatePhoneNumber : /^(?:(?:\+|00)33|0)[67]\d{8}$/
    mobile: '0612345678',
    // example.com est réservé par la RFC 2606 : aucune adresse réelle ne peut être jointe.
    email: `e2e-${role}-${suffix.toLowerCase()}@example.com`,
});

export const donneesInscriptionEnfant = memoiser((suffix) => ({
    ...commun(suffix, 'enfant'),
    nom: `${E2E_PREFIX}RESP${suffix}`,
    prenom: 'Parent',
    nomAutre: `${E2E_PREFIX}URG${suffix}`,
    prenomAutre: 'Contact',
    lienParente: 'Oncle',
    telephoneAutre: '0698765432',
    eleve: {
        nom: `${E2E_PREFIX}ELEVE${suffix}`,
        prenom: 'Enfant',
        dateNaissance: '01.01.2015',
    },
    villeModifiee: 'Evian-les-Bains',
}));

export const donneesInscriptionAdulte = memoiser((suffix) => ({
    ...commun(suffix, 'adulte'),
    nom: `${E2E_PREFIX}ADULTE${suffix}`,
    prenom: 'Etudiant',
    // validateMajorite impose 18 ans révolus.
    dateNaissance: '01.01.1990',
}));

export const donneesAdhesion = memoiser((suffix) => ({
    ...commun(suffix, 'adhesion'),
    nom: `${E2E_PREFIX}ADH${suffix}`,
    prenom: 'Adherent',
    dateNaissance: '01.01.1990',
}));
