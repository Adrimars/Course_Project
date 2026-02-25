import { test, expect } from '@playwright/test';

test.describe('Idea Submission Flow (US2)', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as a regular user
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('user1@example.com');
    await page.getByRole('textbox', { name: /password/i }).fill('User1234!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('shows submit idea link on dashboard', async ({ page }) => {
    await expect(page.getByRole('link', { name: /submit idea/i })).toBeVisible();
  });

  test('navigates to idea submission form', async ({ page }) => {
    await page.getByRole('link', { name: /submit idea/i }).click();
    await expect(page).toHaveURL(/\/ideas\/new/);
    await expect(page.getByRole('heading', { name: /submit.*idea/i })).toBeVisible();
  });

  test('shows validation errors for empty form submission', async ({ page }) => {
    await page.goto('/ideas/new');
    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page.getByText(/title.*required|at least/i)).toBeVisible({ timeout: 5_000 });
  });

  test('successfully submits a valid idea', async ({ page }) => {
    await page.goto('/ideas/new');

    await page.getByLabel(/title/i).fill('My Innovation Idea for the Future Company');
    await page
      .getByLabel(/description/i)
      .fill(
        'This is a detailed description of my innovative idea that provides significant value to the organization and could improve our processes substantially.'
      );
    // Select category
    const categorySelect = page.getByLabel(/category/i);
    await categorySelect.selectOption('TECHNOLOGY');

    await page.getByRole('button', { name: /submit/i }).click();

    // Should redirect to dashboard or show success
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('idea appears on the dashboard after submission', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText(/My Innovation Idea for the Future Company/i)).toBeVisible({
      timeout: 5_000,
    });
  });

  test('idea detail page shows all required sections', async ({ page }) => {
    await page.goto('/dashboard');
    const card = page.getByText(/My Innovation Idea for the Future Company/i).first();
    await card.click();

    // Should be on idea detail page
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Visibility toggle visible to owner
    await expect(page.getByText(/visibility/i)).toBeVisible();
  });
});
