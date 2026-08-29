import path from 'path';

/** Racine du dépôt e2e, pour ancrer les chemins d'état quel que soit le cwd. */
const ROOT = path.resolve(__dirname, '..', '..');

export const ADMIN_STORAGE_STATE = path.join(ROOT, 'playwright', '.auth', 'admin.json');
export const RUN_STATE_FILE = path.join(ROOT, 'playwright', '.auth', 'run.json');

export function getEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing env variable: ${name}`);
    }
    return value;
}
