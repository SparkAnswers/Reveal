import { test, expect } from '@grafana/plugin-e2e';

test('provisioned blur panel shows the countdown footer', async ({ gotoPanelEditPage, readProvisionedDashboard }) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });
  await expect(panelEditPage.panel.locator).toContainText(/Reveals in|Revealed/);
});

test('removing the image shows the empty state', async ({ gotoPanelEditPage, readProvisionedDashboard, page }) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  await gotoPanelEditPage({ dashboard, id: '1' });
  await page.getByRole('button', { name: 'Remove image' }).click();
  await expect(page.getByTestId('reveal-empty')).toBeVisible();
  await expect(page.getByTestId('reveal-empty')).toContainText('Upload an image');
});

test('scheduled panel renders blank or shown, never an error', async ({
  gotoDashboardPage,
  readProvisionedDashboard,
  page,
}) => {
  // The Motorcycle demo's "Bike reveal" is a repeat-schedule panel in the top row (always in view).
  const dashboard = await readProvisionedDashboard({ fileName: 'motorcycle.json' });
  await gotoDashboardPage(dashboard);
  const bike = page.locator('section[data-testid="data-testid Panel header Bike reveal"]');
  await expect(bike).toBeVisible({ timeout: 15_000 });
  await expect(bike.locator('[data-testid="reveal-hidden"], img')).toHaveCount(1, { timeout: 15_000 });
  await expect(bike).not.toContainText(/Panel plugin not found|error/i);
});
