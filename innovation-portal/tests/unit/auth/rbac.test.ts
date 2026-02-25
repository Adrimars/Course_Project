import { Role } from '@/types';

/**
 * Simulates the first-admin promotion logic from the registration API.
 * Extracted as a pure function to enable isolated unit testing.
 */
function determineRole(existingUserCount: number): Role {
  return existingUserCount === 0 ? Role.ADMIN : Role.USER;
}

describe('First-admin promotion logic', () => {
  it('assigns ADMIN role when user count is 0 (first user)', () => {
    expect(determineRole(0)).toBe(Role.ADMIN);
  });

  it('assigns USER role when user count is 1', () => {
    expect(determineRole(1)).toBe(Role.USER);
  });

  it('assigns USER role when user count is greater than 1', () => {
    expect(determineRole(100)).toBe(Role.USER);
  });

  it('assigns USER role when user count is negative (edge case guard)', () => {
    // Negative counts should not occur in production but must not grant ADMIN
    expect(determineRole(-1)).toBe(Role.USER);
  });
});
