import { test, expect } from '@playwright/test';

test.describe('Tableau de bord', () => {
  test('affiche les compteurs et la navigation principale', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /centre de commande/i })).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await expect(nav.getByRole('link', { name: 'Accueil' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Projets' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Rapports' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Paramètres' })).toBeVisible();
  });

  test('navigue vers Projets, Rapports et Paramètres', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Navigation principale' });

    await nav.getByRole('link', { name: 'Projets' }).click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole('heading', { name: 'Projets' })).toBeVisible();

    await nav.getByRole('link', { name: 'Rapports' }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByRole('heading', { name: 'Rapports' })).toBeVisible();

    await nav.getByRole('link', { name: 'Paramètres' }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Paramètres' })).toBeVisible();
  });

  test('bascule le thème clair/sombre', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: 'Basculer le thème' });
    await expect(toggle).toBeVisible();

    const before = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await toggle.click();
    await expect
      .poll(async () => page.evaluate(() => document.documentElement.classList.contains('dark')))
      .toBe(!before);
  });
});
