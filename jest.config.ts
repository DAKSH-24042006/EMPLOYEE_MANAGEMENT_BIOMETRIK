import type { Config } from "jest";
import nextJest from "next/jest.js";

/**
 * Jest Configuration
 * Next.js 15 + TypeScript + React Testing Library
 * createJestConfig handles async transforms, CSS modules, and image mocks.
 */
const createJestConfig = nextJest({
  // Points Next.js to root to load next.config.ts and .env files in tests
  dir: "./",
});

const config: Config = {
  // ─── Test Environment ────────────────────────────────────────────────────────
  testEnvironment: "jest-environment-jsdom",

  // ─── Coverage ────────────────────────────────────────────────────────────────
  collectCoverage: false, // Enable with --coverage flag or in CI pipeline
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{ts,tsx}",
    "!src/app/**/layout.tsx",
    "!src/app/**/loading.tsx",
    "!src/app/**/error.tsx",
    "!src/app/**/not-found.tsx",
    "!src/types/**",
    "!src/styles/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },

  // ─── Module Resolution (mirrors tsconfig paths @/*) ──────────────────────────
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // ─── Global Setup ────────────────────────────────────────────────────────────
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // ─── Test Discovery ───────────────────────────────────────────────────────────
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{ts,tsx}",
    "<rootDir>/src/**/*.{spec,test}.{ts,tsx}",
    "<rootDir>/tests/**/*.{spec,test}.{ts,tsx}",
  ],
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/", "<rootDir>/coverage/"],

  // ─── Misc ──────────────────────────────────────────────────────────────────────
  clearMocks: true, // Reset mock calls/instances between tests
  restoreMocks: true, // Restore spied methods to originals
  verbose: true, // Show individual test results
  maxWorkers: "50%", // Prevent OOM on CI with limited RAM
};

// Wrap with createJestConfig to apply Next.js-specific transforms and settings
export default createJestConfig(config);
