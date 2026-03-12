import { jsPDF } from "jspdf";

interface QuoteItem {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface QuoteData {
  quoteNumber: string;
  date: string;
  notes?: string;
  items: QuoteItem[];
  totalAmount: number;
  priceListTitle?: string;
}

// Load logo as base64 for embedding in PDF
const loadLogoAsBase64 = (): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } else {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = "/images/logo-pdf.png";
  });
};

export const generateQuotePdf = async (data: QuoteData) => {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Load logo
  const logoBase64 = await loadLogoAsBase64();

  // ─── Header Background ───
  doc.setFillColor(23, 23, 23);
  doc.rect(0, 0, pageWidth, 56, "F");

  // Red accent line
  doc.setFillColor(220, 38, 38);
  doc.rect(0, 56, pageWidth, 2.5, "F");

  // Add logo
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", pageWidth / 2 - 20, 4, 40, 28);
  }

  // Company name below logo
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text("Al Masria Group", pageWidth / 2, 38, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(180, 180, 180);
  doc.text("Authorized Toyota Parts & Oils Distributor", pageWidth / 2, 43, { align: "center" });

  // Quote title
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("Price Quotation", pageWidth / 2, 52, { align: "center" });

  y = 67;

  // ─── Quote Info ───
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);

  // Left column
  doc.setFont("helvetica", "bold");
  doc.text("Quote #:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.quoteNumber, margin + 22, y);

  // Right column
  doc.setFont("helvetica", "bold");
  doc.text("Date:", pageWidth - margin - 40, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.date, pageWidth - margin - 28, y);

  y += 6;

  if (data.priceListTitle) {
    doc.setFont("helvetica", "bold");
    doc.text("Price List:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(data.priceListTitle, margin + 25, y);
    y += 6;
  }

  y += 4;

  // ─── Separator ───
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ─── Table Header ───
  const colX = {
    num: margin,
    name: margin + 10,
    sku: margin + 85,
    qty: margin + 120,
    price: margin + 138,
    total: pageWidth - margin - 5,
  };

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, y - 4, contentWidth, 10, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("#", colX.num + 3, y + 2, { align: "center" });
  doc.text("Product", colX.name, y + 2);
  doc.text("SKU", colX.sku, y + 2);
  doc.text("Qty", colX.qty + 5, y + 2, { align: "center" });
  doc.text("Unit Price", colX.price, y + 2);
  doc.text("Total", colX.total, y + 2, { align: "right" });

  y += 10;

  // ─── Table Rows ───
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  data.items.forEach((item, idx) => {
    // Check page overflow
    if (y > pageHeight - 45) {
      doc.addPage();
      y = margin + 10;
    }

    const isEven = idx % 2 === 0;
    if (isEven) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y - 4, contentWidth, 9, "F");
    }

    doc.setTextColor(60, 60, 60);
    doc.text(String(idx + 1), colX.num + 3, y + 1, { align: "center" });

    // Truncate product name if too long
    const maxNameWidth = colX.sku - colX.name - 3;
    let displayName = item.name;
    while (doc.getTextWidth(displayName) > maxNameWidth && displayName.length > 5) {
      displayName = displayName.slice(0, -2) + "..";
    }
    doc.text(displayName, colX.name, y + 1);

    doc.setTextColor(120, 120, 120);
    doc.setFontSize(7);
    doc.text(item.sku, colX.sku, y + 1);
    doc.setFontSize(8);

    doc.setTextColor(60, 60, 60);
    doc.text(String(item.quantity), colX.qty + 5, y + 1, { align: "center" });
    doc.text(formatNum(item.unitPrice), colX.price, y + 1);

    doc.setFont("helvetica", "bold");
    doc.text(formatNum(item.totalPrice), colX.total, y + 1, { align: "right" });
    doc.setFont("helvetica", "normal");

    y += 9;
  });

  // ─── Total Section ───
  y += 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Items count
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Total Items: ${data.items.length}`, margin, y + 1);

  // Grand total
  doc.setFillColor(220, 38, 38);
  doc.roundedRect(pageWidth - margin - 60, y - 4, 60, 12, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(`${formatNum(data.totalAmount)} EGP`, pageWidth - margin - 5, y + 3, { align: "right" });

  y += 16;

  // Notes
  if (data.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text("Notes:", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);

    const lines = doc.splitTextToSize(data.notes, contentWidth - 15);
    doc.text(lines, margin + 15, y);
    y += lines.length * 5 + 4;
  }

  // ─── Footer ───
  const footerY = pageHeight - 15;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, footerY - 6, pageWidth - margin, footerY - 6);
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text("Al Masria Group - Authorized Toyota Parts Distributor", pageWidth / 2, footerY, { align: "center" });
  doc.text("This quote is valid for 7 days from the date of issue", pageWidth / 2, footerY + 4, { align: "center" });

  // Save
  doc.save(`Quote-${data.quoteNumber}.pdf`);
};

function formatNum(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
