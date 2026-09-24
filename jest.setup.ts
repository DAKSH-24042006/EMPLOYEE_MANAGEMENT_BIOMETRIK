import "@testing-library/jest-dom";

/**
 * Global Jest Setup
 * Runs once after the test framework is installed in the environment.
 * Used to extend Jest matchers (e.g., toBeInTheDocument) and set up global mocks.
 */

// ─── Mock Next.js Router ──────────────────────────────────────────────────────
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => "/"),
  redirect: jest.fn(),
  notFound: jest.fn(),
}));

// ─── Mock Environment Variables ───────────────────────────────────────────────
process.env.SYSTEM_ADMIN_USERNAME = "admin";
process.env.SYSTEM_ADMIN_EMAIL = "admin@biometrik.in";
process.env.SYSTEM_ADMIN_PASSWORD = "admin@123";
process.env.JWT_SECRET = "test-jwt-secret-at-least-32-characters-long";
process.env.NODE_ENV = "test";

// ─── Suppress console.error in tests (optional, unmask for debugging) ─────────
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ReactDOM.render") || args[0].includes("act(...)"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
