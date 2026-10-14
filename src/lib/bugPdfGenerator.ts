import { jsPDF } from "jspdf";
import dayjs from "dayjs";

/**
 * Loads an image from a URL and converts to Base64 with dimensions.
 * Resolves null gracefully if image fails to load.
 */
const loadImage = (
  url: string
): Promise<{ data: string; width: number; height: number } | null> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve({
            data: canvas.toDataURL("image/png"),
            width: img.width,
            height: img.height,
          });
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

/**
 * Helper to get status RGB colors
 */
const getStatusColors = (
  status: string
): { bg: [number, number, number]; text: [number, number, number] } => {
  switch (status) {
    case "PASS":
      return { bg: [220, 252, 231], text: [22, 101, 52] }; // Green
    case "FAIL":
      return { bg: [254, 226, 226], text: [153, 27, 27] }; // Red
    case "FIXED":
      return { bg: [243, 232, 255], text: [107, 33, 168] }; // Purple
    case "ASSIGNED":
      return { bg: [224, 242, 254], text: [3, 105, 161] }; // Blue
    case "OPEN":
    default:
      return { bg: [254, 243, 199], text: [180, 83, 9] }; // Orange/Amber
  }
};

/**
 * Generates an Individual Bug Dossier PDF and triggers browser download.
 */
export const downloadBugPdf = async (bug: any, projectTitle?: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoPath = "/Biometrik_New_Logo.png";

  const logo = await loadImage(logoPath);

  const addHeaderAndFooter = (pageNo: number, totalPages?: number) => {
    // Watermark
    if (logo) {
      doc.saveGraphicsState();
      doc.setGState(new (doc as any).GState({ opacity: 0.06 }));
      const w = 110;
      const h = (w * logo.height) / logo.width;
      doc.addImage(
        logo.data,
        "PNG",
        (pageWidth - w) / 2,
        (pageHeight - h) / 2,
        w,
        h,
        undefined,
        "FAST"
      );
      doc.restoreGraphicsState();
    }

    // Top Teal Accent Bar
    doc.setFillColor(0, 137, 123); // #00897b
    doc.rect(0, 0, pageWidth, 4, "F");

    // Header Branding
    if (logo) {
      const headerW = 40;
      const headerH = (headerW * logo.height) / logo.width;
      doc.addImage(logo.data, "PNG", 14, 10, headerW, headerH);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(0, 77, 64);
      doc.text("BIOMETRIK SYSTEMS", 14, 18);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("BUG INVESTIGATION DOSSIER", pageWidth - 14, 16, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${dayjs().format("DD MMM YYYY, hh:mm A")}`, pageWidth - 14, 22, {
      align: "right",
    });

    // Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 26, pageWidth - 14, 26);

    // Footer
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Confidential — Biometrik Systems Bug Audit & Tracking Module", 14, pageHeight - 7);
    doc.text(`Page ${pageNo}`, pageWidth - 14, pageHeight - 7, { align: "right" });
  };

  let pageNum = 1;
  addHeaderAndFooter(pageNum);

  let y = 35;

  // Title Box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, pageWidth - 28, 26, 3, 3, "F");
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, pageWidth - 28, 26, 3, 3, "S");

  // Bug ID Badge
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(3, 105, 161);
  doc.text(bug.bugId || "BUG-XXXX", 20, y + 10);

  // Status Badge
  const st = getStatusColors(bug.status);
  const statusLabel = bug.status || "OPEN";
  const badgeWidth = doc.getTextWidth(statusLabel) + 12;
  doc.setFillColor(...st.bg);
  doc.roundedRect(65, y + 4, badgeWidth, 8, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(...st.text);
  doc.text(statusLabel, 65 + badgeWidth / 2, y + 9.5, { align: "center" });

  // Severity Badge
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Severity:`, 65 + badgeWidth + 10, y + 9.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(
    bug.severity === "Severe" ? 185 : bug.severity === "High" ? 220 : 71,
    bug.severity === "Severe" ? 28 : bug.severity === "High" ? 38 : 85,
    bug.severity === "Severe" ? 28 : bug.severity === "High" ? 38 : 105
  );
  doc.text(bug.severity || "Medium", 65 + badgeWidth + 24, y + 9.5);

  // Bug Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  const truncatedTitle = doc.splitTextToSize(bug.title || "Untitled Defect", pageWidth - 48);
  doc.text(truncatedTitle[0] || "", 20, y + 20);

  y += 34;

  // Metadata Grid
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Metadata & Ownership", 14, y);
  y += 5;

  const projName = projectTitle || bug.projectId?.title || "Project Workspace";
  const reporterName = bug.reportedBy?.name || "System";
  const assigneeName = bug.assignee?.name || "To be assigned";
  const repDate = bug.reportedAt ? dayjs(bug.reportedAt).format("DD MMM YYYY, hh:mm A") : "—";
  const assDate = bug.assignedAt
    ? dayjs(bug.assignedAt).format("DD MMM YYYY, hh:mm A")
    : "Pending assignment";

  const metaRows = [
    [
      { label: "Project", value: projName },
      { label: "Reopen Count", value: String(bug.reopenCount ?? 0) },
    ],
    [
      { label: "Reported By", value: reporterName },
      { label: "Reported Date", value: repDate },
    ],
    [
      { label: "Current Assignee", value: assigneeName },
      { label: "Assigned Date", value: assDate },
    ],
  ];

  metaRows.forEach((row) => {
    // Left column
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y, 88, 12, "F");
    doc.setDrawColor(226, 232, 240);
    doc.rect(14, y, 88, 12, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(row[0].label, 18, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(row[0].value, 18, y + 9.5);

    // Right column
    doc.setFillColor(248, 250, 252);
    doc.rect(104, y, 92, 12, "F");
    doc.rect(104, y, 92, 12, "S");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(row[1].label, 108, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(row[1].value, 108, y + 9.5);

    y += 13;
  });

  y += 4;

  // Description Section (~350 chars)
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Problem Description", 14, y);
  y += 5;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  const descLines = doc.splitTextToSize(
    bug.description || "No description provided.",
    pageWidth - 36
  );
  const descHeight = Math.max(16, descLines.length * 5 + 8);
  doc.roundedRect(14, y, pageWidth - 28, descHeight, 2, 2, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  doc.text(descLines, 18, y + 6);

  y += descHeight + 6;

  // Latest Remarks / Resolution Section
  if (bug.latestDeveloperRemarks || bug.latestQARemarks) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Latest Resolution & Verification Remarks", 14, y);
    y += 5;

    if (bug.latestDeveloperRemarks) {
      doc.setFillColor(250, 245, 255); // faint purple
      doc.setDrawColor(216, 180, 254);
      const devLines = doc.splitTextToSize(
        `Developer Fix Remarks: ${bug.latestDeveloperRemarks}`,
        pageWidth - 36
      );
      const devH = Math.max(14, devLines.length * 5 + 6);
      doc.roundedRect(14, y, pageWidth - 28, devH, 2, 2, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(88, 28, 135);
      doc.text(devLines, 18, y + 6);
      y += devH + 4;
    }

    if (bug.latestQARemarks) {
      const isPass = bug.status === "PASS";
      doc.setFillColor(isPass ? 240 : 254, isPass ? 253 : 242, isPass ? 244 : 242);
      doc.setDrawColor(isPass ? 134 : 252, isPass ? 239 : 165, isPass ? 172 : 165);
      const qaLines = doc.splitTextToSize(
        `QA Test Remarks (${bug.qaOutcome || (isPass ? "PASS" : "FAIL")}): ${bug.latestQARemarks}`,
        pageWidth - 36
      );
      const qaH = Math.max(14, qaLines.length * 5 + 6);
      doc.roundedRect(14, y, pageWidth - 28, qaH, 2, 2, "FD");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(isPass ? 20 : 153, isPass ? 83 : 27, isPass ? 45 : 27);
      doc.text(qaLines, 18, y + 6);
      y += qaH + 4;
    }
  }

  // Audit Trail Table
  if (y > pageHeight - 65) {
    doc.addPage();
    pageNum++;
    addHeaderAndFooter(pageNum);
    y = 35;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Audit Trail & History", 14, y);
  y += 5;

  // Table Header
  doc.setFillColor(0, 137, 123);
  doc.rect(14, y, pageWidth - 28, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text("TIMESTAMP", 18, y + 5);
  doc.text("ACTION", 56, y + 5);
  doc.text("PERFORMED BY", 86, y + 5);
  doc.text("STATUS CHANGE", 124, y + 5);
  doc.text("MANDATORY REMARKS", 156, y + 5);
  y += 7;

  const auditEntries = Array.isArray(bug.auditTrail) ? bug.auditTrail : [];
  if (auditEntries.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text("No audit records recorded.", 18, y + 6);
    y += 10;
  } else {
    auditEntries.forEach((entry: any, idx: number) => {
      if (y > pageHeight - 25) {
        doc.addPage();
        pageNum++;
        addHeaderAndFooter(pageNum);
        y = 35;
      }

      const bgCol = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(bgCol, bgCol, bgCol);
      doc.rect(14, y, pageWidth - 28, 8, "F");
      doc.setDrawColor(241, 245, 249);
      doc.rect(14, y, pageWidth - 28, 8, "S");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);

      const ts = entry.timestamp ? dayjs(entry.timestamp).format("DD/MM/YY HH:mm") : "—";
      const act = entry.action || "UPDATED";
      const user = entry.performedBy?.name || "User";
      const stChange = entry.newStatus
        ? `${entry.previousStatus || "INIT"} → ${entry.newStatus}`
        : "—";
      const rem = doc.splitTextToSize(entry.remarks || "—", pageWidth - 160)[0] || "—";

      doc.text(ts, 18, y + 5.5);
      doc.setFont("helvetica", "bold");
      doc.text(act, 56, y + 5.5);
      doc.setFont("helvetica", "normal");
      doc.text(user.substring(0, 16), 86, y + 5.5);
      doc.text(stChange, 124, y + 5.5);
      doc.text(rem, 156, y + 5.5);

      y += 8;
    });
  }

  doc.save(`${bug.bugId || "BUG"}_Dossier.pdf`);
};

/**
 * Generates a Project Bug Summary PDF Report.
 */
export const downloadProjectBugsPdf = async (projectTitle: string, bugs: any[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const logoPath = "/Biometrik_New_Logo.png";

  const logo = await loadImage(logoPath);

  const addHeaderAndFooter = (pageNo: number) => {
    if (logo) {
      doc.saveGraphicsState();
      doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
      const w = 110;
      const h = (w * logo.height) / logo.width;
      doc.addImage(
        logo.data,
        "PNG",
        (pageWidth - w) / 2,
        (pageHeight - h) / 2,
        w,
        h,
        undefined,
        "FAST"
      );
      doc.restoreGraphicsState();
    }

    doc.setFillColor(0, 137, 123);
    doc.rect(0, 0, pageWidth, 4, "F");

    if (logo) {
      const headerW = 40;
      const headerH = (headerW * logo.height) / logo.width;
      doc.addImage(logo.data, "PNG", 14, 10, headerW, headerH);
    } else {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(0, 77, 64);
      doc.text("BIOMETRIK SYSTEMS", 14, 18);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("PROJECT DEFECT AUDIT REPORT", pageWidth - 14, 16, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${dayjs().format("DD MMM YYYY, hh:mm A")}`, pageWidth - 14, 22, {
      align: "right",
    });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 26, pageWidth - 14, 26);

    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Biometrik Systems Quality Assurance & Bug Tracking Module", 14, pageHeight - 7);
    doc.text(`Page ${pageNo}`, pageWidth - 14, pageHeight - 7, { align: "right" });
  };

  let pageNum = 1;
  addHeaderAndFooter(pageNum);

  let y = 34;

  // Project Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`Project: ${projectTitle || "Active Project"}`, 14, y);
  y += 7;

  // KPI Calculations
  const total = bugs.length;
  const openCount = bugs.filter((b) => b.status === "OPEN").length;
  const assignedCount = bugs.filter((b) => b.status === "ASSIGNED").length;
  const fixedCount = bugs.filter((b) => b.status === "FIXED").length;
  const passCount = bugs.filter((b) => b.status === "PASS").length;
  const failCount = bugs.filter((b) => b.status === "FAIL").length;

  // 6 KPI cards
  const kpis = [
    { label: "Total Bugs", val: total, color: [15, 23, 42] },
    { label: "Open", val: openCount, color: [217, 119, 6] },
    { label: "Assigned", val: assignedCount, color: [2, 132, 199] },
    { label: "Fixed", val: fixedCount, color: [147, 51, 234] },
    { label: "Passed (QA)", val: passCount, color: [22, 163, 74] },
    { label: "Failed (QA)", val: failCount, color: [220, 38, 38] },
  ];

  const cardW = (pageWidth - 28 - 10) / 6;
  kpis.forEach((kpi, i) => {
    const cardX = 14 + i * (cardW + 2);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(cardX, y, cardW, 16, 2, 2, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, y, cardW, 16, 2, 2, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(String(kpi.val), cardX + cardW / 2, y + 8, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, cardX + cardW / 2, y + 13, { align: "center" });
  });

  y += 24;

  // Bugs Table Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("Defects Registry", 14, y);
  y += 5;

  doc.setFillColor(0, 137, 123);
  doc.rect(14, y, pageWidth - 28, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("BUG ID", 18, y + 5);
  doc.text("TITLE", 44, y + 5);
  doc.text("SEVERITY", 108, y + 5);
  doc.text("STATUS", 130, y + 5);
  doc.text("ASSIGNEE", 154, y + 5);
  doc.text("DATE", 184, y + 5);
  y += 7;

  if (bugs.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text("No defects found for this project.", 18, y + 7);
  } else {
    bugs.forEach((b: any, idx: number) => {
      if (y > pageHeight - 20) {
        doc.addPage();
        pageNum++;
        addHeaderAndFooter(pageNum);
        y = 35;
      }

      const bgCol = idx % 2 === 0 ? 255 : 248;
      doc.setFillColor(bgCol, bgCol, bgCol);
      doc.rect(14, y, pageWidth - 28, 7.5, "F");
      doc.setDrawColor(241, 245, 249);
      doc.rect(14, y, pageWidth - 28, 7.5, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(3, 105, 161);
      doc.text(b.bugId || "BUG-XXXX", 18, y + 5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      const titleSnippet = (b.title || "Untitled").substring(0, 36);
      doc.text(titleSnippet, 44, y + 5);

      doc.text(b.severity || "Medium", 108, y + 5);

      // Status text
      const stColor = getStatusColors(b.status);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...stColor.text);
      doc.text(b.status || "OPEN", 130, y + 5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const assName = (b.assignee?.name || "To be assigned").substring(0, 15);
      doc.text(assName, 154, y + 5);

      const d = b.reportedAt ? dayjs(b.reportedAt).format("DD/MM/YY") : "—";
      doc.text(d, 184, y + 5);

      y += 7.5;
    });
  }

  doc.save(`${(projectTitle || "Project").replace(/\s+/g, "_")}_Bugs_Summary.pdf`);
};
