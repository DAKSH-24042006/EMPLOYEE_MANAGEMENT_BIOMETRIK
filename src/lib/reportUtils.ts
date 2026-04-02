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

    // Client Details Section
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55); // Dark Gray
    doc.text("1. Client Information", 15, 75);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99); // Medium Gray
    
    doc.text(`Company:`, 20, 85);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(`${project.clientDetails.companyName}`, 55, 85);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(`Contact:`, 20, 93);
    doc.setTextColor(17, 24, 39);
    doc.text(`${project.clientDetails.contactPerson || "Not Provided"}`, 55, 93);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(`Email:`, 20, 101);
    doc.setTextColor(17, 24, 39);
    doc.text(`${project.clientDetails.email}`, 55, 101);

    // Project Status & Timeline
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.text("2. Logistics & Timeline", 15, 118);
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(`Current Status:`, 20, 128);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 137, 123);
    doc.text(`${project.status.toUpperCase()}`, 55, 128);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(`Start Date:`, 20, 136);
    doc.setTextColor(17, 24, 39);
    doc.text(`${dayjs(project.timeline.startDate).format("DD MMMM YYYY")}`, 55, 136);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(`End Date:`, 20, 144);
    doc.setTextColor(17, 24, 39);
    doc.text(`${dayjs(project.timeline.endDate).format("DD MMMM YYYY")}`, 55, 144);

    // Features Section
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55);
    doc.setFont("helvetica", "bold");
    doc.text("3. Selected Requirements", 15, 161);
    
    let currentY = 171;
    const selectedFeatures = Object.entries(project.features)
      .filter(([_, val]) => val)
      .map(([key, _]) => FEATURE_LABELS[key] || key);

    if (selectedFeatures.length > 0) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(31, 41, 55);
      
      selectedFeatures.forEach((feature) => {
        if (currentY > pageHeight - 30) {
          doc.addPage();
          addWatermark(doc);
          currentY = 25;
        }
        doc.text(`• ${feature}`, 22, currentY);
        currentY += 8;
      });
    } else {
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128);
      doc.text("No specific features selected for this project.", 22, 171);
      currentY += 10;
    }

    // Additional Notes
    if (project.extraAddOns) {
      if (currentY > pageHeight - 50) {
        doc.addPage();
        addWatermark(doc);
        currentY = 25;
      }
      
      doc.setFontSize(16);
      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "bold");
      doc.text("4. Additional Notes", 15, currentY + 10);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      
      const splitNotes = doc.splitTextToSize(project.extraAddOns, pageWidth - 35);
      doc.text(splitNotes, 20, currentY + 22);
    }

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
    const filename = `Report_${project.clientDetails.companyName.replace(/\s+/g, "_")}.pdf`;
    return { doc, filename };
    
  } catch (error) {
    console.error("Critical Error during PDF generation:", error);
    throw new Error("Could not generate PDF report. Please check console for details.");
  }
};
