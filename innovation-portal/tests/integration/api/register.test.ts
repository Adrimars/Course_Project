/**
 * Integration tests for POST /api/auth/register
 *
 * ⚠️  These tests require a live PostgreSQL connection.
 * Set TEST_DATABASE_URL in .env.test or ensure DATABASE_URL points to a test DB.
 *
 * Run with: npm test -- tests/integration/api/register.test.ts
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/register/route';
import { prisma } from '@/lib/db';

// Skip the entire suite if the database has no password configured
// (prevents SASL auth errors when running without a real DB)
function hasDbPassword(): boolean {
  try {
    const url = new URL(process.env.DATABASE_URL ?? '');
    return url.password.length > 0;
  } catch {
    return false;
  }
}
const dbAvailable = hasDbPassword();
const describeDb = dbAvailable ? describe : describe.skip;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describeDb('POST /api/auth/register', () => {
  const validBody = {
    name: 'Test User',
    email: 'testuser@example.com',
    password: 'Password1!',
  };

  // Clean up before each test to keep the DB in a known state
  beforeEach(async () => {
    await prisma.statusHistory.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.idea.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns 201 and creates a user with correct body', async () => {
    const res = await POST(makeRequest(validBody));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.email).toBe(validBody.email);
    expect(body.name).toBe(validBody.name);
    expect(body).not.toHaveProperty('hashedPassword');
  });

  it('assigns ADMIN role to the very first registered user', async () => {
    const res = await POST(makeRequest(validBody));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.role).toBe('ADMIN');
  });

  it('assigns USER role to subsequent registrations', async () => {
    // First user
    await POST(makeRequest(validBody));

    // Second user
    const res = await POST(
      makeRequest({ ...validBody, email: 'another@example.com' })
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.role).toBe('USER');
  });

  it('returns 409 when email is already taken', async () => {
    await POST(makeRequest(validBody));
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain('already exists');
  });

  it('returns 400 with weak password (missing uppercase)', async () => {
    const res = await POST(
      makeRequest({ ...validBody, password: 'password1!' })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await POST(makeRequest({ email: 'a@b.com' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
  });

  it('returns 400 with invalid email', async () => {
    const res = await POST(makeRequest({ ...validBody, email: 'not-valid' }));
    expect(res.status).toBe(400);
  });
});
