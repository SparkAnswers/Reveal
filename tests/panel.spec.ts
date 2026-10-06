import { test, expect } from '@grafana/plugin-e2e';

test('provisioned blur panel shows the countdown footer', async ({ gotoPanelEditPage, readProvisionedDashboard }) => {
  const dashboard = await readProvisionedDashboard({ fileName: 'dashboard.json' });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: '1' });
  await expect(panelEditPage.panel.locator).toContainText(/Reveals in|Revealed/);
});

test('a fresh Reveal panel shows the empty state', async ({ panelEditPage, page }) => {
  await panelEditPage.setVisualization('Reveal');
  await expect(page.getByTestId('reveal-empty')).toBeVisible();
  await expect(page.getByTestId('reveal-empty')).toContainText('Upload an image');
});
