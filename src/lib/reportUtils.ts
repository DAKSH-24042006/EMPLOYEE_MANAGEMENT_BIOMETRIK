import { jsPDF } from "jspdf";
import dayjs from "dayjs";

/**
 * Human-readable labels for project features
 */
const FEATURE_LABELS: Record<string, string> = {
  visitorManagement: "Visitor Management",
  attendanceManagement: "Attendance Management",
  digilockerAuthentication: "Digilocker Authentication",
  webApp: "Web Application",
  androidApp: "Android Application",
  iosApp: "iOS Application",
  videoKYC: "Video KYC",
  rbac: "RBAC System",
  adminPanel: "Admin Panel",
  online: "Online Functionality",
  offline: "Offline Functionality",
  cloud: "Cloud Integration",
  onPremise: "On-Premise Deployment",
};

/**
 * Generates a professional PDF report for a project with custom branding.
 * @param project The project object containing details
 */
export const generateProjectPDF = async (project: any) => {
  const doc = new jsPDF();
  const logoPath = "/Biometrik_New_Logo.png";

  /**
   * Helper to load an image from a URL and convert to Base64 with dimensions
   */
  const loadImage = (url: string): Promise<{ data: string; width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
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
          reject("Canvas context failed");
        }
      };
      img.onerror = () => reject("Image load failed: " + url);
      img.src = url;
    });
  };

  try {
    const logo = await loadImage(logoPath);
    const logoBase64 = logo.data;
    const aspectRatio = logo.width / logo.height;
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    /**
     * Adds a light watermark to the center of the current page.
     */
    const addWatermark = (pdfDoc: any) => {
      pdfDoc.saveGraphicsState();
      pdfDoc.setGState(new pdfDoc.GState({ opacity: 0.1 })); 
      
      const w = 110; 
      const h = w / aspectRatio; // Maintain ratio
      
      pdfDoc.addImage(
        logoBase64, 
        "PNG", 
        (pageWidth - w) / 2, 
        (pageHeight - h) / 2, 
        w, 
        h,
        undefined,
        'FAST'
      );
      
      pdfDoc.restoreGraphicsState();
    };

    // --- PAGE 1 ---
    addWatermark(doc);
    
    // Header Logo (Top Left, Page 1 Only)
    const headerWidth = 45;
    const headerHeight = headerWidth / aspectRatio; // Maintain ratio
    doc.addImage(logoBase64, "PNG", 15, 12, headerWidth, headerHeight);

    // Title Section
    doc.setFontSize(24);
    doc.setTextColor(5, 8, 28); // 05081c
    doc.setFont("helvetica", "bold");
    doc.text("Project Requirement Report", 15, 52);
    
    doc.setDrawColor(5, 8, 28);
    doc.setLineWidth(0.8);
    doc.line(15, 56, pageWidth - 15, 56);

    // Project & Client Details Section
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55); // Dark Gray
    doc.text("1. Project & Client Information", 15, 72);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99); // Medium Gray
    
    doc.text(`Project Title:`, 20, 82);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(`${project.title || "N/A"}`, 60, 82);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(`Client / Company:`, 20, 90);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(`${project.clientDetails?.companyName || project.title || "N/A"}`, 60, 90);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(`Project Manager:`, 20, 98);
    doc.setTextColor(17, 24, 39);
    doc.text(`${project.techOwner?.name || "Unassigned"}`, 60, 98);

    if (project.description) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(75, 85, 99);
      doc.text(`Description:`, 20, 106);
      doc.setTextColor(55, 65, 81);
      const splitDesc = doc.splitTextToSize(project.description, pageWidth - 80);
      doc.text(splitDesc.slice(0, 2), 60, 106);
    }

    // Project Status & Timeline
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.text("2. Logistics & Timeline", 15, 126);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(`Current Status:`, 20, 136);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 137, 123);
    doc.text(`${(project.status || "Active").toUpperCase()}`, 60, 136);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(`Start Date:`, 20, 144);
    doc.setTextColor(17, 24, 39);
    doc.text(`${project.timeline?.startDate ? dayjs(project.timeline.startDate).format("DD MMMM YYYY") : "N/A"}`, 60, 144);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(`End Date:`, 20, 152);
    doc.setTextColor(17, 24, 39);
    doc.text(`${project.timeline?.endDate ? dayjs(project.timeline.endDate).format("DD MMMM YYYY") : "N/A"}`, 60, 152);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(`Est. Budget:`, 20, 160);
    doc.setTextColor(17, 24, 39);
    doc.text(`${project.budget || "Not Specified"}`, 60, 160);

    let currentY = 175;

    // Helper to check for page break
    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > pageHeight - 20) {
        doc.addPage();
        addWatermark(doc);
        currentY = 25;
        return true;
      }
      return false;
    };

    // Helper to print section header
    const printSectionHeader = (title: string) => {
      checkPageBreak(15);
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "bold");
      doc.text(title, 15, currentY);
      currentY += 8;
    };

    // Helper to print body text block
    const printBodyText = (text: string) => {
      if (!text) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(156, 163, 175);
        checkPageBreak(7);
        doc.text("Not specified", 20, currentY);
        currentY += 10;
        return;
      }
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      const splitText = doc.splitTextToSize(text, pageWidth - 35);
      for (const line of splitText) {
        checkPageBreak(7);
        doc.text(line, 20, currentY);
        currentY += 7;
      }
      currentY += 6; // Spacing after block
    };

    // 3. Use Case / Core Objective
    printSectionHeader("3. Use Case / Core Objective");
    printBodyText(project.useCase);

    // 4. Target Users
    printSectionHeader("4. Target Users");
    printBodyText(project.targetUsers);

    // 5. Selected Scope & Deliverables
    printSectionHeader("5. Selected Scope & Deliverables");
    const selectedFeatures = Object.entries(project.features || {})
      .filter(([_, val]) => val)
      .map(([key, _]) => FEATURE_LABELS[key] || key);

    if (selectedFeatures.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      
      selectedFeatures.forEach((feature) => {
        checkPageBreak(7);
        doc.text(`• ${feature}`, 22, currentY);
        currentY += 7;
      });
      currentY += 6;
    } else {
      doc.setFontSize(11);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(156, 163, 175);
      checkPageBreak(7);
      doc.text("No specific features selected.", 20, currentY);
      currentY += 10;
    }

    // 6. Functional Requirements
    printSectionHeader("6. Functional Requirements");
    printBodyText(project.functionalRequirements);

    // 7. Non-Functional Requirements
    printSectionHeader("7. Non-Functional Requirements");
    printBodyText(project.nonFunctionalRequirements);

    // 8. Integrations Needed
    printSectionHeader("8. Integrations Needed");
    printBodyText(project.integrations);

    // 9. Extra Add-ons / Client Notes
    printSectionHeader("9. Extra Add-ons / Client Notes");
    printBodyText(project.extraAddOns);

    // Footer with Page Number
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Generated on ${dayjs().format("DD MMM YYYY")} | Biometrik Requirement Dashboard | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    // Return the doc instead of saving directly for preview functionality
    const filename = `Report_${(project.clientDetails?.companyName || "Project").replace(/\s+/g, "_")}.pdf`;
    return { doc, filename };
    
  } catch (error) {
    console.error("Critical Error during PDF generation:", error);
    throw new Error("Could not generate PDF report. Please check console for details.");
  }
};
