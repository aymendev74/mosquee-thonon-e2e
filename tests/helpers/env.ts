import path from 'path';

/** Racine du dépôt e2e, pour ancrer les chemins d'état quel que soit le cwd. */
const ROOT = path.resolve(__dirname, '..', '..');

export const RUN_STATE_FILE = path.join(ROOT, 'playwright', '.auth', 'run.json');

export function getEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing env variable: ${name}`);
    }
    return value;
}

/**
 * URL absolue d'un endpoint de l'API.
 *
 * Les appels API passent par le contexte du navigateur, dont la `baseURL` est celle du front :
 * on ne peut donc pas s'appuyer dessus. Construire l'URL explicitement évite au passage le piège
 * de `new URL(chemin, baseURL)`, où un chemin commençant par « / » écraserait le préfixe `/api`.
 */
export const urlApi = (chemin: string): string =>
    `${getEnv('E2E_API_BASE_URL').replace(/\/+$/, '')}/${chemin.replace(/^\/+/, '')}`;
