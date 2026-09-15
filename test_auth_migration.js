const BASE_URL = "http://localhost:3001";

async function runTests() {
  console.log("==================================================");
  console.log("STARTING MICROSOFT AUTH & SYSTEM ADMIN MIGRATION TESTS");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST 1: Unknown Microsoft Account Access Denied & Not Created
    // -------------------------------------------------------------
    console.log("--- TEST 1: Unknown Microsoft Account ---");
    const unkRes = await fetch(`${BASE_URL}/api/auth/microsoft/dev-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "unknown.person@external.com" }),
    });

    assert(unkRes.status === 403, `Unknown user status is 403 (received ${unkRes.status})`);
    const unkData = await unkRes.json();
    assert(unkData.error === "not_registered", `Error code is 'not_registered' (received '${unkData.error}')`);
    assert(
      unkData.message.includes("Your Microsoft account is not registered"),
      `Message directs user to contact admin`
    );

    // -------------------------------------------------------------
    // TEST 2: System Admin Login & Recognition
    // -------------------------------------------------------------
    console.log("\n--- TEST 2: System Admin Login ---");
    const adminLoginRes = await fetch(`${BASE_URL}/api/auth/microsoft/dev-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@company.com" }),
    });

    assert(adminLoginRes.status === 200, `Admin login status is 200 (received ${adminLoginRes.status})`);
    const adminData = await adminLoginRes.json();
    assert(adminData.user.role === "SYSTEM_ADMIN", `Admin role is 'SYSTEM_ADMIN'`);
    assert(adminData.redirect === "/admin", `Admin redirect path is '/admin' (received '${adminData.redirect}')`);

    // Extract admin cookie
    const adminCookie = adminLoginRes.headers.get("set-cookie");
    assert(!!adminCookie, "Session token cookie set for System Admin");

    // -------------------------------------------------------------
    // TEST 3: System Admin Employee Management (Add Employee)
    // -------------------------------------------------------------
    console.log("\n--- TEST 3: System Admin Add Employee (No Password) ---");
    const testEmployeeEmail = `test.employee.${Date.now()}@company.com`;
    const addEmpRes = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        name: "Rahul Sharma",
        email: testEmployeeEmail,
        designation: "Software Engineer",
        role: "EMPLOYEE",
        status: "ACTIVE",
      }),
    });

    assert(addEmpRes.status === 201, `Employee created status is 201 (received ${addEmpRes.status})`);
    const createdEmp = await addEmpRes.json();
    assert(createdEmp.name === "Rahul Sharma", `Employee name stored correctly`);
    assert(createdEmp.email === testEmployeeEmail, `Microsoft email stored correctly`);
    assert(createdEmp.designation === "Software Engineer", `Designation stored correctly`);
    assert(createdEmp.role === "EMPLOYEE", `Role defaulted to EMPLOYEE`);
    assert(createdEmp.status === "ACTIVE", `Status defaulted to ACTIVE`);
    assert(!createdEmp.password, `Employee has no password field stored/returned`);

    // -------------------------------------------------------------
    // TEST 4: Registered Active Employee Login
    // -------------------------------------------------------------
    console.log("\n--- TEST 4: Registered Active Employee Login ---");
    const empLoginRes = await fetch(`${BASE_URL}/api/auth/microsoft/dev-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmployeeEmail }),
    });

    assert(empLoginRes.status === 200, `Employee login status is 200`);
    const empData = await empLoginRes.json();
    assert(empData.user.role === "EMPLOYEE", `User role is EMPLOYEE`);
    assert(empData.redirect === "/dashboard", `Employee redirect is '/dashboard' (received '${empData.redirect}')`);

    const empCookie = empLoginRes.headers.get("set-cookie");

    // -------------------------------------------------------------
    // TEST 5: Employee Authorization Restrictions (Server-side 403)
    // -------------------------------------------------------------
    console.log("\n--- TEST 5: Employee Cannot Access Admin Mutation APIs ---");
    const unauthorizedAddRes = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: empCookie,
      },
      body: JSON.stringify({
        name: "Sneaky User",
        email: "sneaky@company.com",
        role: "EMPLOYEE",
      }),
    });

    assert(
      unauthorizedAddRes.status === 403,
      `Employee denied adding users (Status 403, received ${unauthorizedAddRes.status})`
    );

    const unauthorizedPatchRes = await fetch(`${BASE_URL}/api/users/${createdEmp._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: empCookie,
      },
      body: JSON.stringify({
        status: "INACTIVE",
      }),
    });

    assert(
      unauthorizedPatchRes.status === 403,
      `Employee denied editing users (Status 403, received ${unauthorizedPatchRes.status})`
    );

    // -------------------------------------------------------------
    // TEST 6: Existing ADMIN Role Does NOT Get SYSTEM_ADMIN Access
    // -------------------------------------------------------------
    console.log("\n--- TEST 6: Legacy ADMIN Role Isolation ---");
    // Create an employee with role 'ADMIN' via System Admin
    const legacyAdminEmail = `legacy.admin.${Date.now()}@company.com`;
    const addLegacyAdminRes = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        name: "Legacy Business Admin",
        email: legacyAdminEmail,
        designation: "Project Coordinator",
        role: "ADMIN",
        status: "ACTIVE",
      }),
    });
    const legacyAdminDoc = await addLegacyAdminRes.json();

    // Log in as legacy admin
    const legacyLoginRes = await fetch(`${BASE_URL}/api/auth/microsoft/dev-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: legacyAdminEmail }),
    });
    const legacyCookie = legacyLoginRes.headers.get("set-cookie");

    // Attempt to call System Admin POST /api/users with legacy ADMIN token
    const legacyAddAttempt = await fetch(`${BASE_URL}/api/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: legacyCookie,
      },
      body: JSON.stringify({
        name: "Attempted User",
        email: "attempted@company.com",
      }),
    });

    assert(
      legacyAddAttempt.status === 403,
      `Legacy ADMIN role is REJECTED from System Admin APIs (Status 403, received ${legacyAddAttempt.status})`
    );

    // -------------------------------------------------------------
    // TEST 7: System Admin Deactivates Employee & Inactive Block
    // -------------------------------------------------------------
    console.log("\n--- TEST 7: Deactivation & Inactive User Block ---");
    const deactivateRes = await fetch(`${BASE_URL}/api/users/${createdEmp._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        status: "INACTIVE",
      }),
    });

    assert(deactivateRes.status === 200, `Deactivation request status is 200`);
    const deactivatedEmp = await deactivateRes.json();
    assert(deactivatedEmp.status === "INACTIVE", `Employee status is now INACTIVE in DB`);

    // Now try to log in as deactivated employee
    const inactiveLoginRes = await fetch(`${BASE_URL}/api/auth/microsoft/dev-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmployeeEmail }),
    });

    assert(inactiveLoginRes.status === 403, `Inactive employee login DENIED (Status 403)`);
    const inactiveData = await inactiveLoginRes.json();
    assert(inactiveData.error === "inactive", `Error code is 'inactive'`);
    assert(
      inactiveData.message.includes("Your account is currently inactive"),
      `Clear inactive message shown to user`
    );

    // -------------------------------------------------------------
    // TEST 8: System Admin Reactivates Employee
    // -------------------------------------------------------------
    console.log("\n--- TEST 8: Reactivate Employee & Login Restored ---");
    const reactivateRes = await fetch(`${BASE_URL}/api/users/${createdEmp._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: adminCookie,
      },
      body: JSON.stringify({
        status: "ACTIVE",
      }),
    });
    assert(reactivateRes.status === 200, `Reactivation status is 200`);

    // Verify employee can log in again
    const restoredLoginRes = await fetch(`${BASE_URL}/api/auth/microsoft/dev-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmployeeEmail }),
    });
    assert(restoredLoginRes.status === 200, `Reactivated employee successfully logs in again (Status 200)`);

    // -------------------------------------------------------------
    // TEST 9: Legacy Login Endpoints Disabled & Preserved
    // -------------------------------------------------------------
    console.log("\n--- TEST 9: Legacy Login Endpoints Disabled ---");
    const legacyLoginCall = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@company.com", password: "somepassword" }),
    });

    assert(
      legacyLoginCall.status === 403,
      `Legacy /api/auth/login returns 403 disabled status (received ${legacyLoginCall.status})`
    );

    const legacyCheckEmailCall = await fetch(`${BASE_URL}/api/auth/check-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@company.com" }),
    });

    assert(
      legacyCheckEmailCall.status === 403,
      `Legacy /api/auth/check-email returns 403 disabled status (received ${legacyCheckEmailCall.status})`
    );

    // -------------------------------------------------------------
    // TEST 10: Logout Clears Session Cookies
    // -------------------------------------------------------------
    console.log("\n--- TEST 10: Logout API ---");
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
    });
    assert(logoutRes.status === 200, `Logout status is 200`);
    const logoutCookies = logoutRes.headers.get("set-cookie");
    assert(
      logoutCookies.includes("token=;") || logoutCookies.includes("Max-Age=0") || logoutCookies.includes("expires="),
      "Logout clears session cookie"
    );

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log("\n==================================================");
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution encountered an error:", err);
    process.exit(1);
  }
}

runTests();
