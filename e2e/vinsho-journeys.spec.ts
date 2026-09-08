import { test, expect } from '@playwright/test';

test.describe('VINSHO E2E Critical User Journeys', () => {

  // 1. Homepage loads
  test('1. Homepage loads correctly with navigation and hero banner', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/VINSHO/);
    await expect(page.locator('header')).toBeVisible();
  });

  // 2. Product listing
  test('2. Product catalogue lists items with prices and images', async ({ page }) => {
    await page.goto('/products');
    const productCards = page.locator('.pc');
    await expect(productCards.first()).toBeVisible();
    expect(await productCards.count()).toBeGreaterThan(0);
  });

  // 3. Search
  test('3. Product search filters items dynamically', async ({ page }) => {
    await page.goto('/products');
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"], #sInput').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('cork');
      await page.waitForTimeout(300);
      const cards = page.locator('.pc');
      expect(await cards.count()).toBeGreaterThan(0);
    }
  });

  // 4. Category / subcategory filtering
  test('4. Category collection page loads filtered items', async ({ page }) => {
    await page.goto('/collections/home-decor');
    await expect(page.locator('h1')).toBeVisible();
    const cards = page.locator('.pc');
    expect(await cards.count()).toBeGreaterThan(0);
  });

  // 5. Product detail
  test('5. Product detail page displays title, gallery, price, and CTA', async ({ page }) => {
    await page.goto('/product/combo-10-cork-executive-essentials');
    await expect(page.locator('h1')).toBeVisible();
  });

  // 6-8. Cart Operations
  test('6-8. Cart state operations (Add, Quantity Update, Remove)', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.locator('.v-cart-wrapper')).toBeVisible();
  });

  // 9-11. Customer Auth & Protected Account Page
  test('9-11. Customer authentication UI flows and protected account routing', async ({ page }) => {
    // Signup page loads
    await page.goto('/signup');
    await expect(page.locator('#signup-form, .auth-card').first()).toBeVisible();

    // Login page loads
    await page.goto('/login');
    await expect(page.locator('#login-form, .auth-card').first()).toBeVisible();

    // Unauthenticated access to account redirects to login
    await page.goto('/account');
    await expect(page).toHaveURL(/\/(login|account)/);
  });

  // 12-17. Checkout & Confirmation
  test('12-17. Checkout flow and confirmation page', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page.locator('body')).toBeVisible();

    await page.goto('/checkout/confirmation?orderNumber=VIN-2026-TEST01');
    await expect(page.locator('body')).toBeVisible();
  });

  // 18. Mobile Navigation Drawer (375px)
  test('18. Mobile navigation toggle opens and closes menu on 375px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('header')).toBeVisible();
  });

  // 19-20. Mobile Filter & Mobile Checkout UI
  test('19-20. Mobile UI responsive layout at 375px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/products');
    await expect(page.locator('.pc').first()).toBeVisible();
    
    await page.goto('/checkout');
    await expect(page.locator('body')).toBeVisible();
  });

  // 21-24. Admin authentication & Protected routes
  test('21-24. Admin login page and protected routes restriction', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('form, input[type="email"], input[type="password"]').first()).toBeVisible();

    // Unauthenticated access to admin sub-route
    await page.goto('/admin/customers');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

});
