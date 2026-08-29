import { APIRequestContext, expect } from '@playwright/test';
import { ajouterJours, analyserDate, anneeScolaireDebut, aujourdHui, formaterDate } from './dates';

export type NomParametre =
    | 'REINSCRIPTION_ENABLED'
    | 'INSCRIPTION_ENFANT_ENABLED_FROM_DATE'
    | 'INSCRIPTION_ADULTE_ENABLED_FROM_DATE'
    | 'SEND_EMAIL_ENABLED';

export type ParametresApplicatifs = Record<NomParametre, string>;

type ParamsDto = {
    reinscriptionPrioritaire?: boolean;
    inscriptionEnfantEnabledFromDate?: string;
    inscriptionAdulteEnabledFromDate?: string;
    sendMailEnabled?: boolean;
};

export type ApplicationTarif = 'COURS_ENFANT' | 'COURS_ADULTE';

type PeriodeInfoDto = {
    id: number;
    dateDebut: string;
    dateFin: string;
    anneeDebut: number;
    anneeFin: number;
    nbMaxInscription: number;
    application: string;
};

/** Marge confortable : evite qu'une inscription de test bascule en LISTE_ATTENTE. */
const NB_MAX_INSCRIPTION = 500;

type ReponseHttp = { ok(): boolean; status(): number; text(): Promise<string> };

const verifierReponse = async (reponse: ReponseHttp, contexte: string): Promise<void> => {
    if (!reponse.ok()) {
        throw new Error(`${contexte} - HTTP ${reponse.status()} : ${await reponse.text()}`);
    }
};

export const lireParametres = async (api: APIRequestContext): Promise<ParametresApplicatifs> => {
    const reponse = await api.get('v1/params');
    await verifierReponse(reponse, 'Lecture des parametres');
    const dto: ParamsDto = await reponse.json();
    return {
        REINSCRIPTION_ENABLED: dto.reinscriptionPrioritaire ? 'true' : 'false',
        INSCRIPTION_ENFANT_ENABLED_FROM_DATE: dto.inscriptionEnfantEnabledFromDate ?? '',
        INSCRIPTION_ADULTE_ENABLED_FROM_DATE: dto.inscriptionAdulteEnabledFromDate ?? '',
        SEND_EMAIL_ENABLED: dto.sendMailEnabled ? 'true' : 'false',
    };
};

export const ecrireParametres = async (api: APIRequestContext, parametres: ParametresApplicatifs): Promise<void> => {
    const corps = Object.entries(parametres).map(([name, value]) => ({ name, value }));
    const reponse = await api.post('v1/params', { data: corps });
    await verifierReponse(reponse, 'Ecriture des parametres');
};

/**
 * Ouvre les inscriptions enfant et adulte, desactive la priorite aux reinscriptions (qui
 * masquerait le formulaire public et ferait refuser la creation cote back) et coupe l'envoi
 * d'e-mails pendant toute la duree du run.
 */
export const ouvrirLesInscriptions = async (api: APIRequestContext): Promise<void> => {
    const dateOuverture = formaterDate(ajouterJours(aujourdHui(), -30));
    await ecrireParametres(api, {
        REINSCRIPTION_ENABLED: 'false',
        INSCRIPTION_ENFANT_ENABLED_FROM_DATE: dateOuverture,
        INSCRIPTION_ADULTE_ENABLED_FROM_DATE: dateOuverture,
        SEND_EMAIL_ENABLED: 'false',
    });
};

const listerPeriodes = async (api: APIRequestContext, application: ApplicationTarif): Promise<PeriodeInfoDto[]> => {
    const reponse = await api.get('v1/periodes', { params: { application } });
    await verifierReponse(reponse, `Lecture des periodes ${application}`);
    return reponse.json();
};

const couvreAujourdHui = (periode: PeriodeInfoDto, jour: Date): boolean =>
    analyserDate(periode.dateDebut) <= jour && jour <= analyserDate(periode.dateFin);

/**
 * Calcule une fenetre encadrant le jour courant sans chevaucher aucune periode existante :
 * le back rejette toute creation qui se superposerait a une autre (code d'erreur OVERLAP).
 */
const calculerFenetre = (periodes: PeriodeInfoDto[], jour: Date): { debut: Date; fin: Date } => {
    let debut = ajouterJours(jour, -30);
    let fin = ajouterJours(jour, 180);

    for (const periode of periodes) {
        const debutExistant = analyserDate(periode.dateDebut);
        const finExistante = analyserDate(periode.dateFin);
        if (finExistante < jour && finExistante >= debut) {
            debut = ajouterJours(finExistante, 1);
        }
        if (debutExistant > jour && debutExistant <= fin) {
            fin = ajouterJours(debutExistant, -1);
        }
    }

    if (debut > jour || fin < jour) {
        throw new Error(
            `Impossible de creer une periode couvrant le ${formaterDate(jour)} sans chevauchement : `
            + `fenetre calculee ${formaterDate(debut)} -> ${formaterDate(fin)}.`,
        );
    }
    return { debut, fin };
};

const creerPeriode = async (
    api: APIRequestContext,
    application: ApplicationTarif,
    periodesExistantes: PeriodeInfoDto[],
): Promise<void> => {
    const jour = aujourdHui();
    const { debut, fin } = calculerFenetre(periodesExistantes, jour);
    const anneeDebut = anneeScolaireDebut(jour);
    const periode = {
        dateDebut: formaterDate(debut),
        dateFin: formaterDate(fin),
        anneeDebut,
        anneeFin: anneeDebut + 1,
        nbMaxInscription: NB_MAX_INSCRIPTION,
        application,
    };

    const validation = await api.post('v1/periodes/validation', { data: periode });
    await verifierReponse(validation, `Validation de la periode ${application}`);
    const resultat = await validation.json();
    if (!resultat.success) {
        throw new Error(`Periode ${application} refusee par le back : ${resultat.errorCode}`);
    }

    const creation = await api.post('v1/periodes', { data: resultat.periode });
    await verifierReponse(creation, `Creation de la periode ${application}`);
};

/** Grille complete : le back mappe les montants par reflexion et refuse toute valeur nulle. */
const grilleTarifs = (idPeriode: number, application: ApplicationTarif) =>
    application === 'COURS_ENFANT'
        ? {
            idPeriode,
            montantBase1Enfant: 60, montantBase1EnfantAdherent: 50,
            montantEnfant1Enfant: 90, montantEnfant1EnfantAdherent: 80,
            montantBase2Enfant: 60, montantBase2EnfantAdherent: 50,
            montantEnfant2Enfant: 80, montantEnfant2EnfantAdherent: 70,
            montantBase3Enfant: 60, montantBase3EnfantAdherent: 50,
            montantEnfant3Enfant: 70, montantEnfant3EnfantAdherent: 60,
            montantBase4Enfant: 60, montantBase4EnfantAdherent: 50,
            montantEnfant4Enfant: 60, montantEnfant4EnfantAdherent: 50,
        }
        : {
            idPeriode,
            montantEtudiant: 100,
            montantSansActivite: 120,
            montantAvecActivite: 150,
        };

const garantirTarifs = async (
    api: APIRequestContext,
    idPeriode: number,
    application: ApplicationTarif,
): Promise<void> => {
    const reponse = await api.get(`v1/tarifs-admin/${idPeriode}`);
    await verifierReponse(reponse, `Lecture des tarifs de la periode ${idPeriode}`);
    const grilleExistante = await reponse.json();
    const montantTemoin = application === 'COURS_ENFANT'
        ? grilleExistante.montantBase1Enfant
        : grilleExistante.montantEtudiant;

    if (montantTemoin !== null && montantTemoin !== undefined) {
        return;
    }

    const sauvegarde = await api.post('v1/tarifs-admin', { data: grilleTarifs(idPeriode, application) });
    await verifierReponse(sauvegarde, `Enregistrement des tarifs ${application}`);
};

/**
 * Garantit qu'une periode couvrant la date du jour existe pour l'application donnee, et qu'elle
 * porte une grille de tarifs. Sans cela le formulaire public echoue au calcul du tarif et le
 * back refuse la creation de l'inscription.
 */
export const garantirPeriodeEtTarifs = async (
    api: APIRequestContext,
    application: ApplicationTarif,
): Promise<void> => {
    const jour = aujourdHui();
    let periodes = await listerPeriodes(api, application);

    if (!periodes.some((periode) => couvreAujourdHui(periode, jour))) {
        await creerPeriode(api, application, periodes);
        periodes = await listerPeriodes(api, application);
    }

    const periodeActive = periodes.find((periode) => couvreAujourdHui(periode, jour));
    expect(periodeActive, `Aucune periode ${application} ne couvre le ${formaterDate(jour)}`).toBeDefined();
    await garantirTarifs(api, periodeActive!.id, application);
};

/**
 * Les tarifs d'adhesion ne dependent d'aucune periode active (la recherche ne filtre pas sur la
 * date) : on ne peut donc pas les creer ici, mais leur absence rendrait le test d'adhesion
 * incomprehensible - autant echouer tout de suite avec un message explicite.
 */
export const verifierTarifsAdhesion = async (api: APIRequestContext): Promise<void> => {
    const reponse = await api.get('v1/tarifs', { params: { application: 'ADHESION' } });
    await verifierReponse(reponse, "Lecture des tarifs d'adhesion");
    const tarifs = await reponse.json();
    expect(
        tarifs.length,
        "Aucun tarif ADHESION en base : le formulaire d'adhesion ne proposerait aucune cotisation.",
    ).toBeGreaterThan(0);
};
