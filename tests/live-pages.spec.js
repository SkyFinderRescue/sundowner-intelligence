const { test, expect } = require('@playwright/test');

const BASE = 'https://skyfinderrescue.github.io/sundowner-intelligence/';

test.describe.configure({ mode: 'serial', timeout: 300000 });

async function assertNoRuntimeErrors(page, runtimeErrors) {
  expect(runtimeErrors, `Runtime errors:\n${runtimeErrors.join('\n')}`).toEqual([]);
  const appText = await page.locator('body').innerText();
  expect(appText).not.toMatch(/TypeError|ReferenceError|SyntaxError/);
}

async function waitForLoadedTiles(page, urlPart) {
  await expect.poll(async () => {
    return page.locator(`.leaflet-tile-pane img[src*="${urlPart}"]`).evaluateAll(imgs =>
      imgs.filter(img => img.complete && img.naturalWidth > 0 && img.naturalHeight > 0).length
    );
  }, { timeout: 60000, intervals: [500, 1000, 2000] }).toBeGreaterThan(0);
}

async function waitForForecast(page) {
  await expect(page.locator('#status')).toContainText(/Live forecast complete|Load error/, { timeout: 240000 });
  const status = await page.locator('#status').innerText();
  expect(status, 'The production forecast must complete without degraded-mode load error').toContain('Live forecast complete');
}

test('desktop production app, map layers, forecast, navigation and branding', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.stack || error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /TypeError|ReferenceError|SyntaxError/.test(message.text())) runtimeErrors.push(message.text());
  });

  const response = await page.goto(`${BASE}?qa=desktop-${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  expect(response && response.ok()).toBeTruthy();
  await expect(page).toHaveTitle(/Sundowner Predictor/);
  await expect(page.locator('.brand')).toBeVisible();
  await expect(page.locator('.brand-mark')).toBeVisible();
  const brandImage = await page.locator('.brand-mark').evaluate(el => getComputedStyle(el).backgroundImage);
  expect(brandImage).toContain('data:image/webp');

  await expect(page.locator('#map.leaflet-container')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('.basemap-toggle')).toBeVisible();
  await expect(page.locator('.basemap-toggle button[data-map="topo"]')).toHaveClass(/active/);
  const tileFilter = await page.locator('.leaflet-tile-pane').evaluate(el => getComputedStyle(el).filter);
  expect(tileFilter).toBe('none');
  await waitForLoadedTiles(page, 'World_Topo_Map');

  await expect(page.locator('.leaflet-tooltip.zone-label')).toHaveCount(8, { timeout: 120000 });
  expect(await page.locator('.leaflet-overlay-pane path.leaflet-interactive').count()).toBeGreaterThanOrEqual(8);

  await page.locator('.basemap-toggle button[data-map="satellite"]').click();
  await expect(page.locator('.basemap-toggle button[data-map="satellite"]')).toHaveClass(/active/);
  await waitForLoadedTiles(page, 'World_Imagery');
  await waitForLoadedTiles(page, 'World_Boundaries_and_Places');

  await page.locator('.basemap-toggle button[data-map="topo"]').click();
  await expect(page.locator('.basemap-toggle button[data-map="topo"]')).toHaveClass(/active/);
  await waitForLoadedTiles(page, 'World_Topo_Map');

  await waitForForecast(page);
  await page.locator('#zone').selectOption('Gaviota');
  await expect(page.locator('#focusTitle')).toContainText('Gaviota');
  await expect(page.locator('#mP')).not.toHaveText('—');
  await expect(page.locator('#mG')).toContainText('mph');
  await expect(page.locator('#timeline .tr').first()).toBeVisible();

  await page.locator('button[data-view="stations"]').click();
  await expect(page.locator('#stations.view')).toHaveClass(/on/);
  await expect.poll(() => page.locator('#stationRows tr').count(), { timeout: 30000 }).toBeGreaterThan(0);

  await page.locator('button[data-view="health"]').click();
  await expect(page.locator('#health.view')).toHaveClass(/on/);
  await expect.poll(() => page.locator('#healthList .healthrow').count(), { timeout: 30000 }).toBeGreaterThan(0);

  await page.locator('button[data-view="forecast"]').click();
  await expect(page.locator('#forecast.view')).toHaveClass(/on/);
  await assertNoRuntimeErrors(page, runtimeErrors);
  await page.screenshot({ path: 'test-results/desktop-production.png', fullPage: true });
  await context.close();
});

test('iPhone production layout, map-first order, toggle and no horizontal overflow', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2
  });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.stack || error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /TypeError|ReferenceError|SyntaxError/.test(message.text())) runtimeErrors.push(message.text());
  });

  const response = await page.goto(`${BASE}?qa=iphone-${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  expect(response && response.ok()).toBeTruthy();
  await expect(page.locator('.brand')).toBeVisible();
  await expect(page.locator('.brand-mark')).toBeVisible();
  await expect(page.locator('.primary-nav')).toBeVisible();
  await expect(page.locator('#map.leaflet-container')).toBeVisible({ timeout: 60000 });
  await expect(page.locator('.basemap-toggle')).toBeVisible();
  await waitForLoadedTiles(page, 'World_Topo_Map');

  const order = await page.evaluate(() => ({
    mapTop: document.querySelector('.map-stage').getBoundingClientRect().top,
    detailTop: document.querySelector('.sidebar').getBoundingClientRect().top,
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
  expect(order.mapTop).toBeLessThan(order.detailTop);
  expect(order.scrollWidth).toBeLessThanOrEqual(order.innerWidth + 2);
  await expect(page.locator('.pressure-section')).toBeHidden();
  await expect(page.locator('.drivers-section')).toBeHidden();

  await page.locator('.basemap-toggle button[data-map="satellite"]').click();
  await waitForLoadedTiles(page, 'World_Imagery');
  await page.locator('.basemap-toggle button[data-map="topo"]').click();
  await waitForLoadedTiles(page, 'World_Topo_Map');

  await waitForForecast(page);
  await expect(page.locator('.leaflet-tooltip.zone-label')).toHaveCount(8);
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(page.locator('#contact')).toContainText('sky.bonillo@gmail.com');
  await assertNoRuntimeErrors(page, runtimeErrors);
  await page.screenshot({ path: 'test-results/iphone-production.png', fullPage: true });
  await context.close();
});
