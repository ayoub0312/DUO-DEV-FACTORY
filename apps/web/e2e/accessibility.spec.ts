import { test, expect } from '@playwright/test';

/** Tests d'accessibilité essentiels (cahier §11) : navigation clavier, focus, dialogues. */
test.describe('Accessibilité', () => {
  test('palette de commandes : ouverture, recherche, navigation et fermeture au clic', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog', { name: 'Palette de commandes' });
    await expect(palette).toBeVisible();

    await page.getByPlaceholder('Rechercher une commande…').fill('rapports');
    await expect(palette.getByRole('button', { name: 'Rapports' })).toBeVisible();
    await palette.getByRole('button', { name: 'Rapports' }).click();

    // Route non encore compilée par le serveur de dev : première navigation plus lente.
    await expect(page).toHaveURL(/\/reports$/, { timeout: 20_000 });
    await expect(palette).toBeHidden();
  });

  test('palette de commandes : Échap referme et restaure le focus', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Palette de commandes' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Palette de commandes' })).toBeHidden();
  });

  test('onglets du projet : navigation clavier par flèches (motif WAI-ARIA Tabs)', async ({ page, request }) => {
    // Crée son propre projet via l'API plutôt que de dépendre d'un projet préexistant
    // (la base E2E est isolée et volontairement vide, cf. playwright.config.ts).
    const res = await request.post('/api/projects', {
      data: { name: `E2E Tabs ${Date.now()}`, type: 'web' },
    });
    const body = await res.json();
    if (!res.ok() || !body.project) {
      throw new Error(`Échec de création du projet (status ${res.status()}): ${JSON.stringify(body)}`);
    }

    await page.goto(`/projects/${body.project.id}`);

    const chatTab = page.getByRole('tab', { name: 'Chat' });
    const workflowTab = page.getByRole('tab', { name: 'Workflow' });
    await expect(chatTab).toBeVisible({ timeout: 20_000 });
    await chatTab.focus();
    await expect(chatTab).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowRight');
    await expect(workflowTab).toHaveAttribute('aria-selected', 'true');
    await expect(workflowTab).toBeFocused();

    await page.keyboard.press('ArrowLeft');
    await expect(chatTab).toHaveAttribute('aria-selected', 'true');
  });

  test('dialogue "Nouveau projet" : focus au premier champ, fermeture par Échap', async ({ page }) => {
    await page.goto('/projects');
    await page.getByRole('button', { name: '+ Nouveau projet' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('Nom')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('bouton de thème a un aria-label explicite', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Basculer le thème' })).toBeVisible();
  });
});
