import { registerSchema, loginSchema } from '@/lib/validations/user';

describe('registerSchema', () => {
  const validPayload = {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'Password1!',
  };

  it('passes with valid inputs', () => {
    expect(registerSchema.safeParse(validPayload).success).toBe(true);
  });

  it('fails without uppercase letter in password', () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      password: 'password1!',
    });
    expect(result.success).toBe(false);
  });

  it('fails without lowercase letter in password', () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      password: 'PASSWORD1!',
    });
    expect(result.success).toBe(false);
  });

  it('fails without digit in password', () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      password: 'Password!!',
    });
    expect(result.success).toBe(false);
  });

  it('fails without special character in password', () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      password: 'Password1',
    });
    expect(result.success).toBe(false);
  });

  it('fails when password is shorter than 8 characters', () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      password: 'P1!',
    });
    expect(result.success).toBe(false);
  });

  it('fails with invalid email format', () => {
    const result = registerSchema.safeParse({
      ...validPayload,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('fails when name is too short (< 2 chars)', () => {
    const result = registerSchema.safeParse({ ...validPayload, name: 'J' });
    expect(result.success).toBe(false);
  });

  it('fails when required fields are missing', () => {
    expect(registerSchema.safeParse({}).success).toBe(false);
    expect(registerSchema.safeParse({ email: 'a@b.com' }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('passes with valid email and password', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.com', password: 'any' }).success
    ).toBe(true);
  });

  it('fails with missing password', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: '' }).success).toBe(
      false
    );
  });

  it('fails with invalid email', () => {
    expect(
      loginSchema.safeParse({ email: 'bad', password: 'pw' }).success
    ).toBe(false);
  });
});
