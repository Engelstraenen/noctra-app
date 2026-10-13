import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Every test gets a fresh browser context, including cart and favorites.
  await page.goto('/#shop');
  await expect(page.getByRole('heading', { name: 'THE COLLECTION.' })).toBeVisible();
});

test('product cards start with flatlays and browse photos without opening a product', async ({ page }) => {
  const cards = page.locator('.product-card');
  await expect(cards).toHaveCount(6);

  for (const card of await cards.all()) {
    await expect(card.locator('.product-open img')).toHaveAttribute('src', /-flatlay\.png$/);
    await expect(card.locator('.product-open img')).toHaveAttribute('alt', /Flatlay/);
    await expect(card.locator('.card-gallery-counter')).toHaveText('1 / 3');
  }

  const hoodie = cards.filter({ has: page.getByRole('button', { name: 'STUDIO HOODIE ansehen', exact: true }) });
  const image = hoodie.locator('.product-open img');
  const next = hoodie.getByRole('button', { name: 'Nächstes Foto von STUDIO HOODIE', exact: true });
  const previous = hoodie.getByRole('button', { name: 'Vorheriges Foto von STUDIO HOODIE', exact: true });

  await next.click();
  await expect(image).toHaveAttribute('src', /hoodie-model-1\.png$/);
  await expect(hoodie.locator('.card-gallery-counter')).toHaveText('2 / 3');
  await expect(page.locator('#product-dialog')).not.toBeVisible();

  // Changing one card must leave the other product previews alone.
  for (const card of (await cards.all()).slice(1)) {
    await expect(card.locator('.product-open img')).toHaveAttribute('src', /-flatlay\.png$/);
    await expect(card.locator('.card-gallery-counter')).toHaveText('1 / 3');
  }

  await previous.click();
  await expect(image).toHaveAttribute('src', /hoodie-flatlay\.png$/);
  await previous.click();
  await expect(image).toHaveAttribute('src', /hoodie-model-2\.png$/);
  await expect(hoodie.locator('.card-gallery-counter')).toHaveText('3 / 3');
  await next.click();
  await expect(image).toHaveAttribute('src', /hoodie-flatlay\.png$/);
  await expect(page.locator('#product-dialog')).not.toBeVisible();
});

test('product gallery opens the selected card photo and keeps the chosen size', async ({ page }) => {
  const hoodie = page.locator('.product-card').filter({
    has: page.getByRole('button', { name: 'STUDIO HOODIE ansehen', exact: true }),
  });
  await hoodie.getByRole('button', { name: 'Nächstes Foto von STUDIO HOODIE', exact: true }).click();
  await hoodie.getByRole('button', { name: 'STUDIO HOODIE ansehen', exact: true }).click();

  const product = page.getByRole('dialog', { name: 'STUDIO HOODIE', exact: true });
  const photo = product.locator('#detail-gallery-image');
  const medium = product.getByRole('button', { name: 'Größe M', exact: true });
  await expect(product).toBeVisible();
  await expect(photo).toHaveAttribute('src', /hoodie-model-1\.png$/);
  await expect(product.locator('.gallery-counter')).toHaveText('2 / 3');
  await expect(product.getByRole('button', { name: /STUDIO HOODIE: .* anzeigen/ })).toHaveCount(3);

  await medium.click();
  await product.getByRole('button', { name: 'STUDIO HOODIE: Modelfoto 2 anzeigen', exact: true }).click();
  await expect(photo).toHaveAttribute('src', /hoodie-model-2\.png$/);
  await expect(medium).toHaveAttribute('aria-pressed', 'true');
  await expect(product.locator('#selected-size-label')).toHaveText('M');

  await product.getByRole('button', { name: 'STUDIO HOODIE: Flatlay anzeigen', exact: true }).click();
  await expect(photo).toHaveAttribute('src', /hoodie-flatlay\.png$/);
  await expect(medium).toHaveAttribute('aria-pressed', 'true');
  await expect(product.locator('#selected-size-label')).toHaveText('M');
});

test('cart quantities update totals and simulated checkout clears the cart', async ({ page }) => {
  await page.getByRole('button', { name: 'STUDIO HOODIE ansehen', exact: true }).click();
  const product = page.getByRole('dialog', { name: 'STUDIO HOODIE', exact: true });
  await product.getByRole('button', { name: 'Größe M', exact: true }).click();
  await product.getByRole('button', { name: 'IN DEN WARENKORB', exact: true }).click();

  const panel = page.locator('#panel-dialog');
  await expect(panel).toBeVisible();
  await expect(panel.getByLabel('Menge', { exact: true })).toHaveText('1');
  await expect(panel.locator('.cart-line-info')).toContainText('CHARCOAL / M');
  await panel.getByRole('button', { name: 'STUDIO HOODIE Menge erhöhen', exact: true }).click();
  await expect(panel.getByLabel('Menge', { exact: true })).toHaveText('2');
  await expect(panel.locator('.summary-total strong')).toHaveText(/202,90\s*€/);

  // The changed quantity must survive closing and reopening the cart.
  await panel.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.getByRole('button', { name: 'Warenkorb öffnen, 2 Artikel', exact: true }).click();
  await expect(panel.getByLabel('Menge', { exact: true })).toHaveText('2');
  await panel.getByRole('button', { name: 'ZUM DEMO-CHECKOUT', exact: true }).click();
  await expect(panel.getByRole('heading', { name: 'DEMO-CHECKOUT', exact: true })).toBeVisible();
  await expect(panel.getByLabel('Vorname', { exact: true })).toHaveValue('Alex');
  await expect(panel.getByLabel('E-Mail', { exact: true })).toHaveValue('alex@example.com');
  await panel.getByRole('radio', { name: /PayPal/ }).check();
  await panel.getByRole('button', { name: 'DEMO-BESTELLUNG ABSCHLIESSEN', exact: true }).click();

  await expect(panel.getByRole('heading', { name: 'ALL SET.', exact: true })).toBeVisible();
  await expect(panel.locator('.demo-receipt')).toContainText('NOCTRA-DEMO-026');
  await expect(panel.locator('.demo-receipt')).toContainText('PayPal');
  await expect(panel.locator('.demo-receipt')).toContainText(/202,90\s*€/);
  await expect(panel).toContainText('Keine echte Bestellung. Keine Zahlung.');

  await panel.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.getByRole('button', { name: 'Warenkorb öffnen, 0 Artikel', exact: true }).click();
  await expect(panel).toContainText('Dein Warenkorb ist noch leer.');
  await panel.getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Warenkorb öffnen, 0 Artikel', exact: true }).click();
  await expect(panel).toContainText('Dein Warenkorb ist noch leer.');
});
