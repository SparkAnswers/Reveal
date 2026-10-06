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

test('scheduled panel on the demo dashboard renders blank or shown, never an error', async ({
  gotoDashboardPage,
  readProvisionedDashboard,
  page,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  await gotoDashboardPage(dashboard);
  // The schedule panels sit below the fold and Grafana lazy-loads offscreen panels.
  await page.mouse.wheel(0, 4000);
  const even = page.locator('section[data-testid="data-testid Panel header Pops up on even minutes"]');
  await expect(even).toBeVisible({ timeout: 15_000 });
  await expect(even.locator('[data-testid="reveal-hidden"], img')).toHaveCount(1);
});
