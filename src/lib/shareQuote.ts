/**
 * Share quote via WhatsApp or Email
 */

interface ShareQuoteData {
  quoteNumber: string;
  items: { name: string; sku: string; quantity: number; unitPrice: number; totalPrice: number }[];
  totalAmount: number;
  priceListTitle?: string;
  date?: string;
  notes?: string;
}

function buildQuoteText(data: ShareQuoteData): string {
  const date = data.date || new Date().toLocaleDateString("ar-EG");
  const lines: string[] = [
    `📋 *عرض أسعار — المصرية جروب*`,
    `رقم العرض: ${data.quoteNumber}`,
    `التاريخ: ${date}`,
  ];

  if (data.priceListTitle) {
    lines.push(`من كشف: ${data.priceListTitle}`);
  }

  lines.push("", "━━━━━━━━━━━━━━━━━━━━━━");

  data.items.forEach((item, idx) => {
    lines.push(
      `${idx + 1}. ${item.name}`,
      `   رقم القطعة: ${item.sku}`,
      `   الكمية: ${item.quantity} × ${item.unitPrice.toLocaleString("en-US")} = ${item.totalPrice.toLocaleString("en-US")} ج.م`
    );
  });

  lines.push(
    "━━━━━━━━━━━━━━━━━━━━━━",
    `💰 *الإجمالي: ${data.totalAmount.toLocaleString("en-US")} ج.م*`,
    "",
    "— المصرية جروب لقطع غيار وزيوت تويوتا"
  );

  return lines.join("\n");
}

function buildEmailBody(data: ShareQuoteData): string {
  const date = data.date || new Date().toLocaleDateString("ar-EG");
  const lines: string[] = [
    `عرض أسعار — المصرية جروب`,
    `رقم العرض: ${data.quoteNumber}`,
    `التاريخ: ${date}`,
  ];

  if (data.priceListTitle) {
    lines.push(`من كشف: ${data.priceListTitle}`);
  }

  lines.push("", "──────────────────────");

  data.items.forEach((item, idx) => {
    lines.push(
      `${idx + 1}. ${item.name} (${item.sku})`,
      `   الكمية: ${item.quantity} × ${item.unitPrice.toLocaleString("en-US")} = ${item.totalPrice.toLocaleString("en-US")} ج.م`
    );
  });

  lines.push(
    "──────────────────────",
    `الإجمالي: ${data.totalAmount.toLocaleString("en-US")} ج.م`,
    "",
    "المصرية جروب لقطع غيار وزيوت تويوتا"
  );

  return lines.join("\n");
}

export function shareQuoteWhatsApp(data: ShareQuoteData, phone?: string) {
  const text = buildQuoteText(data);
  const baseUrl = phone
    ? `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=`
    : `https://wa.me/?text=`;
  window.open(baseUrl + encodeURIComponent(text), "_blank");
}

export function shareQuoteEmail(data: ShareQuoteData, toEmail?: string) {
  const subject = `عرض أسعار رقم ${data.quoteNumber} — المصرية جروب`;
  const body = buildEmailBody(data);
  const mailto = `mailto:${toEmail || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(mailto);
}
