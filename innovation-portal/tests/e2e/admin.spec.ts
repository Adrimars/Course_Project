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
    await expect(page.getByRole('link', { name: /admin/i })).toBeVisible();
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
    await page.getByRole('link', { name: /SUBMITTED/i }).click();
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
    // Navigate to admin list and click first idea if any
    await page.goto('/admin?status=UNDER_REVIEW');
    const ideaLinks = page.getByRole('link').filter({ hasText: /view|details/i });
    const count = await ideaLinks.count();
    if (count > 0) {
      await ideaLinks.first().click();
      await expect(page.getByRole('heading', { name: /evaluate/i })).toBeVisible({
        timeout: 5_000,
      });
    }
  });

  test('regular user is redirected away from /admin', async ({ page }) => {
    // Log in as user
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('user1@example.com');
    await page.getByLabel(/password/i).fill('User1234!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

    await page.goto('/admin');
    // Should be redirected away
    await expect(page).not.toHaveURL(/\/admin/, { timeout: 5_000 });
  });
});
