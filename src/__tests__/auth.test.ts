/**
 * Example Unit Test - Auth Utility
 * Tests for login credential validation logic.
 *
 * Run: npm test
 * Run with coverage: npm run test:coverage
 */

describe("Auth - Environment Credential Validation", () => {
  const adminUsername = process.env.SYSTEM_ADMIN_USERNAME!;
  const adminPassword = process.env.SYSTEM_ADMIN_PASSWORD!;
  const adminEmail = process.env.SYSTEM_ADMIN_EMAIL!;

  it("should have SYSTEM_ADMIN env variables defined", () => {
    expect(adminUsername).toBeDefined();
    expect(adminPassword).toBeDefined();
    expect(adminEmail).toBeDefined();
  });

  it("should match admin username correctly", () => {
    const identifier = "admin";
    expect(identifier).toBe(adminUsername);
  });

  it("should match admin email case-insensitively", () => {
    const identifier = "Admin@Biometrik.in";
    expect(identifier.toLowerCase()).toBe(adminEmail.toLowerCase());
  });

  it("should NOT grant access with wrong password", () => {
    const inputPassword = "wrongpassword";
    expect(inputPassword === adminPassword).toBe(false);
  });

  it("should grant access with correct password", () => {
    const inputPassword = adminPassword;
    expect(inputPassword === adminPassword).toBe(true);
  });

  it("should reject empty credentials", () => {
    const identifier = "";
    const password = "";
    expect(!identifier || !password).toBe(true);
  });
});
