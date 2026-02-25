import type { Config } from 'jest';

const config: Config = {
  projects: [
    // ─── Unit & Integration Tests (Node environment) ──────────────────────
    {
      displayName: 'node',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/tests/unit/**/*.test.ts',
        '<rootDir>/tests/integration/**/*.test.ts',
      ],
      moduleNameMapper: {
        '^uuid$': '<rootDir>/__mocks__/uuid.js',
        '^file-type$': '<rootDir>/__mocks__/file-type.js',
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      setupFiles: ['<rootDir>/tests/integration/setup.ts'],
      setupFilesAfterEnv: [],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { strict: true } }],
      },
    },
    // ─── React Component Tests (jsdom environment) ────────────────────────
    {
      displayName: 'jsdom',
      preset: 'ts-jest',
      testEnvironment: 'jest-environment-jsdom',
      testMatch: ['<rootDir>/tests/unit/components/**/*.test.tsx'],
      moduleNameMapper: {
        '^uuid$': '<rootDir>/__mocks__/uuid.js',
        '^file-type$': '<rootDir>/__mocks__/file-type.js',
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: { strict: true, jsx: 'react-jsx' } }],
      },
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/app/**/layout.tsx',
    '!src/generated/**',
  ],
  coverageThreshold: {
    global: {
      lines: 80,
    },
  },
};

export default config;
