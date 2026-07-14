import { test, expect } from '@playwright/test';

/**
 * Parcours principal (cahier §11) : créer un projet, écrire dans le chat, démarrer le
 * workflow Mock et observer sa progression jusqu'à un état non-DRAFT.
 */
test.describe('Parcours principal du projet', () => {
  test('créer un projet, discuter, démarrer le workflow', async ({ page }) => {
    const projectName = `E2E Projet ${Date.now()}`;

    await page.goto('/projects');
    await page.getByRole('button', { name: '+ Nouveau projet' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Nom').fill(projectName);
    await dialog.getByLabel('Description').fill('Projet créé par le test E2E.');
    await dialog.getByRole('button', { name: 'Créer le projet' }).click();

    await expect(dialog).toBeHidden();
    const main = page.locator('main');
    await expect(main.getByRole('link', { name: projectName })).toBeVisible({ timeout: 10_000 });

    await main.getByRole('link', { name: projectName }).click();
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();

    // --- Chat ---
    const composer = page.getByLabel('Écrire un message');
    await composer.fill('Bonjour, voici mon besoin.');
    await page.getByRole('button', { name: 'Envoyer' }).click();
    await expect(page.getByText('Bonjour, voici mon besoin.')).toBeVisible({ timeout: 10_000 });

    // --- Workflow ---
    await page.getByRole('tab', { name: 'Workflow' }).click();
    const workflowPanel = page.locator('#tabpanel-workflow');
    await expect(workflowPanel.getByText('Brouillon')).toBeVisible();

    await workflowPanel.getByRole('button', { name: 'Démarrer' }).click();

    // Le démarrage transitionne DRAFT → ANALYZING_REQUIREMENTS de façon synchrone ;
    // le Mock Adapter poursuit ensuite en tâche de fond.
    await expect(workflowPanel.getByText('Analyse du besoin')).toBeVisible({ timeout: 10_000 });
  });
});
