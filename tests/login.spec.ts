import { test } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://staging.inscription-amc.fr/');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.getByRole('textbox', { name: 'Nom d\'utilisateur' }).click();
  await page.getByRole('textbox', { name: 'Nom d\'utilisateur' }).fill(getEnv('E2E_USER'));
  await page.getByRole('textbox', { name: 'Nom d\'utilisateur' }).press('Tab');
  await page.getByRole('textbox', { name: 'Mot de passe' }).fill(getEnv('E2E_PASSWORD'));
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.locator('.ant-avatar').hover();
  await page.getByText('Se déconnecter').click();
});

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env variable: ${name}`);
  }
  return value;
}
