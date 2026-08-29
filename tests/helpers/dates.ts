/** Utilitaires de date au format applicatif `DD.MM.YYYY`, sans dépendance supplémentaire. */

export const formaterDate = (date: Date): string => {
    const jj = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${jj}.${mm}.${date.getFullYear()}`;
};

export const analyserDate = (valeur: string): Date => {
    const [jj, mm, aaaa] = valeur.split('.').map(Number);
    return new Date(aaaa, mm - 1, jj);
};

export const aujourdHui = (): Date => {
    const maintenant = new Date();
    return new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
};

export const ajouterJours = (date: Date, jours: number): Date => {
    const copie = new Date(date);
    copie.setDate(copie.getDate() + jours);
    return copie;
};

/**
 * Année scolaire de référence : la campagne d'inscription s'ouvre en mai (cf. ModalPeriode,
 * qui propose par défaut une période du 01/05 au 30/09).
 */
export const anneeScolaireDebut = (date: Date): number =>
    date.getMonth() >= 4 ? date.getFullYear() : date.getFullYear() - 1;
