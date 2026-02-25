import { test, expect } from '@playwright/test';

/**
 * E2E tests: Authentication flow
 * US1: Register → Login → Access dashboard → Logout → Verify redirect
 */

// Use a unique email per test run to avoid conflicts
const testEmail = `e2e-auth-${Date.now()}@example.com`;
const testPassword = 'Password1!';
const testName = 'E2E Test User';

test.describe('Authentication flow (US1)', () => {
  test('full auth cycle: register → login → dashboard → logout', async ({ page }) => {
    // ── 1. Visit registration page ────────────────────────────────────────────
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();

    // ── 2. Fill registration form ─────────────────────────────────────────────
    await page.getByLabel('Full Name').fill(testName);
    await page.getByLabel('Email Address').fill(testEmail);
    await page.getByRole('textbox', { name: 'Password' }).fill(testPassword);
    await page.getByRole('button', { name: 'Create Account' }).click();

    // ── 3. Should redirect to /login after successful registration ────────────
    await expect(page).toHaveURL('/login');

    // ── 4. Fill login form ────────────────────────────────────────────
    await page.getByLabel('Email Address').fill(testEmail);
    await page.getByRole('textbox', { name: 'Password' }).fill(testPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // ── 5. Should land on dashboard ───────────────────────────────────────────
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText(testName)).toBeVisible();

    // ── 6. Log out ────────────────────────────────────────────────────────────
    await page.getByRole('button', { name: 'Log Out' }).click();

    // ── 7. Should redirect to /login after logout ─────────────────────────────
    await expect(page).toHaveURL('/login');
  });

  test('unauthenticated access to /dashboard redirects to /login', async ({ page }) => {
    // Navigate directly without logging in
    await page.goto('/dashboard');

    // NextAuth middleware should redirect to /login
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email Address').fill('nonexistent@example.com');
    await page.getByLabel('Password').fill('WrongPass1!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Invalid');
  });

  test('shows client-side validation errors for weak password on register', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('Full Name').fill('Test');
    await page.getByLabel('Email Address').fill('v@test.com');
    await page.getByRole('textbox', { name: 'Password' }).fill('weak');
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Should show inline validation errors, not navigate away
    await expect(page).toHaveURL('/register');
    await expect(page.getByRole('alert')).toBeVisible();
  });
});
