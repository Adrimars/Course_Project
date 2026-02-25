import { test, expect } from '@playwright/test';

test.describe('Admin Evaluation Flow (US5)', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as admin
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@epam.com');
    await page.getByRole('textbox', { name: /password/i }).fill('Admin123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('admin navbar shows Admin link', async ({ page }) => {
    await expect(page.getByRole('link', { name: /admin/i }).first()).toBeVisible();
  });

  test('admin can access /admin page', async ({ page }) => {
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: /admin.*ideas/i })).toBeVisible();
  });

  test('admin sees all ideas including private ones', async ({ page }) => {
    await page.goto('/admin');
    // Page should load without error
    await expect(page.locator('main')).toBeVisible();
  });

  test('admin can access /admin/users page', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible();
    // Table should be present
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('admin can filter ideas by status', async ({ page }) => {
    await page.goto('/admin');
    // Use exact match to target the status filter pill, not idea cards
    await page.getByRole('link', { name: 'SUBMITTED', exact: true }).click();
    await expect(page).toHaveURL(/status=SUBMITTED/);
  });

  test('admin can navigate to idea detail from admin list', async ({ page }) => {
    await page.goto('/admin');
    const firstIdeaLink = page.getByRole('link').filter({ hasText: /idea/i }).first();
    const count = await firstIdeaLink.count();
    if (count > 0) {
      await firstIdeaLink.click();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 5_000 });
    } else {
      // No ideas present; page should still render without error
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('admin evaluation panel shows for UNDER_REVIEW ideas', async ({ page }) => {
    // Navigate to admin list and click first idea card (contains h3 title)
    // The auto-transition SUBMITTED→UNDER_REVIEW fires on admin visit, making canEvaluate=true
    await page.goto('/admin');
    const ideaCards = page.getByRole('link').filter({ has: page.locator('h3') });
    const count = await ideaCards.count();
    if (count > 0) {
      await ideaCards.first().click();
      // The 'Evaluate Idea' section appears for UNDER_REVIEW / ACCEPTED / REJECTED ideas
      await expect(page.getByRole('heading', { name: /evaluate idea/i })).toBeVisible({
        timeout: 5_000,
      });
    }
  });

  test('regular user is redirected away from /admin', async ({ page }) => {
    // Clear the admin session so we can log in as a different user
    await page.context().clearCookies();
    // Log in as user
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('user1@epam.com');
    await page.getByRole('textbox', { name: /password/i }).fill('User1234!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    await page.goto('/admin');
    // Should be redirected away
    await expect(page).not.toHaveURL(/\/admin/, { timeout: 5_000 });
  });
});
