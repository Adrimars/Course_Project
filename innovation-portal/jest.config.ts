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
  // V8 provider avoids Babel-based JSX parse errors when collecting coverage
  // from TSX files that are not transformed at the root config level.
  coverageProvider: 'v8',
  collectCoverageFrom: [
    // Only collect coverage from server-side TypeScript logic
    // (routes, lib, types).  React component/page files need @testing-library
    // setup which is not in scope for these server-focused tests.
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/generated/**',
  ],
  coverageThreshold: {
    global: {
      lines: 80,
    },
  },
};

export default config;
