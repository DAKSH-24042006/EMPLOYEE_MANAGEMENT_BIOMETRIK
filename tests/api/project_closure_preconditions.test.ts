describe("Phase 3: Strict Project Closure Precondition Integrity", () => {
  interface ClosureVerificationParams {
    openWorkItemsCount: number;
    openCriticalBlockersCount: number;
    totalTestCasesCount: number;
    passedTestCasesCount: number;
    uatStatus: string;
    internalApproval: boolean;
    salesApproval: boolean;
    clientSignoffStatus: string;
  }

  function validateProjectClosure(params: ClosureVerificationParams): {
    canClose: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    // 1. Work items check
    if (params.openWorkItemsCount > 0) {
      reasons.push("Closure blocked: There are active/incomplete work items.");
    }

    // 2. Critical/High blockers check
    if (params.openCriticalBlockersCount > 0) {
      reasons.push("Closure blocked: Critical or High priority blockers are still open.");
    }

    // 3. Test cases passed
    if (
      params.totalTestCasesCount > 0 &&
      params.passedTestCasesCount < params.totalTestCasesCount
    ) {
      reasons.push(
        `Closure blocked: Only ${params.passedTestCasesCount}/${params.totalTestCasesCount} test cases have Passed.`
      );
    }

    // 4. UAT check
    if (params.uatStatus !== "Passed" && params.uatStatus !== "Client Accepted") {
      reasons.push("Closure blocked: Project UAT has not been passed or accepted by client.");
    }

    // 5. Signoffs check
    if (!params.internalApproval) {
      reasons.push("Closure blocked: Internal technical approval is missing.");
    }
    if (!params.salesApproval) {
      reasons.push("Closure blocked: Sales / Commercial approval is missing.");
    }
    if (params.clientSignoffStatus !== "Approved") {
      reasons.push("Closure blocked: Formal client signoff has not been approved.");
    }

    return {
      canClose: reasons.length === 0,
      reasons,
    };
  }

  it("BLOCKS closure when there are active/incomplete work items", () => {
    const result = validateProjectClosure({
      openWorkItemsCount: 3,
      openCriticalBlockersCount: 0,
      totalTestCasesCount: 10,
      passedTestCasesCount: 10,
      uatStatus: "Passed",
      internalApproval: true,
      salesApproval: true,
      clientSignoffStatus: "Approved",
    });

    expect(result.canClose).toBe(false);
    expect(result.reasons).toContain("Closure blocked: There are active/incomplete work items.");
  });

  it("BLOCKS closure when there are critical/high priority blockers open", () => {
    const result = validateProjectClosure({
      openWorkItemsCount: 0,
      openCriticalBlockersCount: 1,
      totalTestCasesCount: 5,
      passedTestCasesCount: 5,
      uatStatus: "Passed",
      internalApproval: true,
      salesApproval: true,
      clientSignoffStatus: "Approved",
    });

    expect(result.canClose).toBe(false);
    expect(result.reasons).toContain(
      "Closure blocked: Critical or High priority blockers are still open."
    );
  });

  it("BLOCKS closure when test cases are not 100% Passed", () => {
    const result = validateProjectClosure({
      openWorkItemsCount: 0,
      openCriticalBlockersCount: 0,
      totalTestCasesCount: 12,
      passedTestCasesCount: 10,
      uatStatus: "Passed",
      internalApproval: true,
      salesApproval: true,
      clientSignoffStatus: "Approved",
    });

    expect(result.canClose).toBe(false);
    expect(result.reasons).toContain("Closure blocked: Only 10/12 test cases have Passed.");
  });

  it("BLOCKS closure when UAT is pending", () => {
    const result = validateProjectClosure({
      openWorkItemsCount: 0,
      openCriticalBlockersCount: 0,
      totalTestCasesCount: 5,
      passedTestCasesCount: 5,
      uatStatus: "In Progress",
      internalApproval: true,
      salesApproval: true,
      clientSignoffStatus: "Approved",
    });

    expect(result.canClose).toBe(false);
    expect(result.reasons).toContain(
      "Closure blocked: Project UAT has not been passed or accepted by client."
    );
  });

  it("BLOCKS closure when 3-way signoffs are incomplete", () => {
    const result = validateProjectClosure({
      openWorkItemsCount: 0,
      openCriticalBlockersCount: 0,
      totalTestCasesCount: 5,
      passedTestCasesCount: 5,
      uatStatus: "Passed",
      internalApproval: true,
      salesApproval: false,
      clientSignoffStatus: "Pending",
    });

    expect(result.canClose).toBe(false);
    expect(result.reasons).toContain("Closure blocked: Sales / Commercial approval is missing.");
    expect(result.reasons).toContain(
      "Closure blocked: Formal client signoff has not been approved."
    );
  });

  it("ALLOWS closure when all preconditions are satisfied", () => {
    const result = validateProjectClosure({
      openWorkItemsCount: 0,
      openCriticalBlockersCount: 0,
      totalTestCasesCount: 15,
      passedTestCasesCount: 15,
      uatStatus: "Passed",
      internalApproval: true,
      salesApproval: true,
      clientSignoffStatus: "Approved",
    });

    expect(result.canClose).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });
});
