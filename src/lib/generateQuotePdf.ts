import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { saveAndShareFile } from "@/lib/native";

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
  dealerName?: string;
  dealerPhone?: string;
}

function formatNum(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// Load Arabic font before rendering
async function loadArabicFont(): Promise<void> {
  const fontUrl = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap";
  
  // Check if already loaded
  if (document.querySelector(`link[href="${fontUrl}"]`)) {
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = fontUrl;
  document.head.appendChild(link);

  // Wait for font to load
  await new Promise<void>((resolve) => {
    if ((document as any).fonts) {
      (document as any).fonts.ready.then(() => resolve());
    } else {
      setTimeout(resolve, 1500);
    }
  });
}

function buildQuoteHtml(data: QuoteData): string {
  const rows = data.items.map((item, idx) => `
    <tr style="background:${idx % 2 === 0 ? '#fff' : '#fef2f2'}">
      <td style="padding:10px 8px;text-align:center;color:#666;font-size:13px;border-bottom:1px solid #fecaca">${idx + 1}</td>
      <td style="padding:10px 8px;text-align:right;font-size:13px;color:#222;border-bottom:1px solid #fecaca;font-weight:500">${item.name}</td>
      <td style="padding:10px 8px;text-align:center;font-size:12px;color:#888;border-bottom:1px solid #fecaca;font-family:monospace;direction:ltr">${item.sku}</td>
      <td style="padding:10px 8px;text-align:center;font-size:13px;color:#333;border-bottom:1px solid #fecaca">${item.quantity}</td>
      <td style="padding:10px 8px;text-align:center;font-size:13px;color:#333;border-bottom:1px solid #fecaca;direction:ltr">${formatNum(item.unitPrice)}</td>
      <td style="padding:10px 8px;text-align:center;font-size:13px;color:#b91c1c;border-bottom:1px solid #fecaca;font-weight:700;direction:ltr">${formatNum(item.totalPrice)}</td>
    </tr>
  `).join("");

  return `
    <div id="quote-pdf-content" style="width:780px;font-family:'Cairo','Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;background:#fff;padding:0">
      <!-- Header -->
      <div style="background:#fff;padding:30px 30px 14px;text-align:center;border-radius:6px 6px 0 0;border-bottom:none">
        <img src="/images/toyota-quote-logo.png" style="height:200px;margin-bottom:10px" crossorigin="anonymous" />
        <div style="color:#333;font-size:22px;font-weight:800;margin-top:8px;letter-spacing:1px;font-family:'Cairo',sans-serif">عرض سعر</div>
      </div>
      <div style="height:4px;background:linear-gradient(90deg,#dc2626,#ef4444,#dc2626)"></div>

      <!-- Dealer & Quote Info -->
      <div style="display:flex;justify-content:space-between;padding:18px 30px 10px;border-bottom:1px solid #e5e5e5">
        <div>
          <span style="color:#888;font-size:12px;font-family:'Cairo',sans-serif">رقم العرض:</span>
          <span style="color:#222;font-size:14px;font-weight:700;margin-right:6px;direction:ltr;unicode-bidi:embed">${data.quoteNumber}</span>
        </div>
        <div>
          <span style="color:#888;font-size:12px;font-family:'Cairo',sans-serif">التاريخ:</span>
          <span style="color:#222;font-size:13px;font-weight:600;margin-right:6px">${data.date}</span>
        </div>
      </div>
      ${data.dealerName || data.dealerPhone ? `
      <div style="display:flex;justify-content:space-between;padding:8px 30px;border-bottom:1px solid #eee;background:#fef2f2">
        ${data.dealerName ? `<div><span style="color:#888;font-size:12px;font-family:'Cairo',sans-serif">العميل:</span> <span style="color:#222;font-size:13px;font-weight:600;margin-right:6px">${data.dealerName}</span></div>` : ""}
        ${data.dealerPhone ? `<div><span style="color:#888;font-size:12px;font-family:'Cairo',sans-serif">هاتف:</span> <span style="color:#222;font-size:13px;font-weight:600;margin-right:6px;direction:ltr;unicode-bidi:embed">${data.dealerPhone}</span></div>` : ""}
      </div>` : ""}

      <!-- Table -->
      <div style="padding:16px 24px">
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e5e5;border-radius:6px;overflow:hidden">
          <thead>
             <tr style="background:#dc2626">
              <th style="padding:10px 8px;text-align:center;font-size:11px;color:#fff;font-weight:700;border-bottom:2px solid #b91c1c;width:40px">#</th>
              <th style="padding:10px 8px;text-align:right;font-size:11px;color:#fff;font-weight:700;border-bottom:2px solid #b91c1c">الصنف</th>
              <th style="padding:10px 8px;text-align:center;font-size:11px;color:#fff;font-weight:700;border-bottom:2px solid #b91c1c;width:110px">رقم القطعة</th>
              <th style="padding:10px 8px;text-align:center;font-size:11px;color:#fff;font-weight:700;border-bottom:2px solid #b91c1c;width:50px">الكمية</th>
              <th style="padding:10px 8px;text-align:center;font-size:11px;color:#fff;font-weight:700;border-bottom:2px solid #b91c1c;width:90px">سعر الوحدة</th>
              <th style="padding:10px 8px;text-align:center;font-size:11px;color:#fff;font-weight:700;border-bottom:2px solid #b91c1c;width:90px">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>

      <!-- Total -->
      <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 30px;border-top:2px solid #fecaca;margin:0 24px">
        <div style="color:#888;font-size:13px;font-family:'Cairo',sans-serif">عدد الأصناف: <span style="color:#333;font-weight:700">${data.items.length}</span></div>
        <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;padding:12px 32px;border-radius:8px;font-size:18px;font-weight:800;direction:ltr;box-shadow:0 2px 8px rgba(220,38,38,0.3)">
          ${formatNum(data.totalAmount)} EGP
        </div>
      </div>

      ${data.notes ? `
      <div style="padding:14px 30px;margin:0 24px;border-top:1px solid #eee">
        <span style="color:#666;font-size:12px;font-weight:700;font-family:'Cairo',sans-serif">ملاحظات: </span>
        <span style="color:#555;font-size:12px">${data.notes}</span>
      </div>` : ""}

      <!-- Footer -->
      <div style="text-align:center;padding:16px 30px;border-top:2px solid #dc2626;margin-top:16px">
        <div style="color:#dc2626;font-size:11px;font-weight:600">Toyota Genuine Parts</div>
        <div style="color:#999;font-size:9px;margin-top:4px;font-family:'Cairo',sans-serif">هذا العرض ساري لمدة 7 أيام من تاريخ الإصدار</div>
      </div>
    </div>
  `;
}

export const generateQuotePdf = async (data: QuoteData) => {
  // Load Arabic font first
  await loadArabicFont();

  // Create a hidden container for rendering
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.zIndex = "-1";
  container.innerHTML = buildQuoteHtml(data);
  document.body.appendChild(container);

  const element = container.firstElementChild as HTMLElement;

  // Wait for logo image to load
  const img = element.querySelector("img");
  if (img && !img.complete) {
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      setTimeout(resolve, 3000);
    });
  }

  // Extra delay for font rendering
  await new Promise(r => setTimeout(r, 500));

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const imgData = canvas.toDataURL("image/png");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth - 10; // 5mm margin each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 5; // top margin

    pdf.addImage(imgData, "PNG", 5, position, imgWidth, imgHeight);
    heightLeft -= (pdfHeight - 10);

    while (heightLeft > 0) {
      position = -(pdfHeight - 10 - (imgHeight - heightLeft)) + 5;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 5, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 10);
    }

    const blob = pdf.output("blob");
    await saveAndShareFile(
      { kind: "blob", blob },
      `quote-${data.quoteNumber}.pdf`,
      { dialogTitle: `عرض السعر ${data.quoteNumber}` }
    );
  } catch (error) {
    console.error("Error generating PDF:", error);
  } finally {
    document.body.removeChild(container);
  }
};
