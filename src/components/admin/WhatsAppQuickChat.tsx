import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppQuickChatProps {
  phone: string;
  customerName?: string;
  context?: string;
  size?: "sm" | "icon";
  className?: string;
}

function formatPhoneForWA(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, "");
  cleaned = cleaned.replace(/^002/, "").replace(/^0020/, "");
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  if (cleaned.startsWith("0")) cleaned = "2" + cleaned;
  if (/^\d{10}$/.test(cleaned)) cleaned = "2" + cleaned;
  return cleaned;
}

function buildMessage(customerName?: string, context?: string): string {
  const name = customerName || "عميلنا الكريم";
  let msg = `أهلاً ${name}، من المصرية جروب لقطع غيار تويوتا.`;
  if (context) msg += `\n${context}`;
  return msg;
}

export default function WhatsAppQuickChat({
  phone,
  customerName,
  context,
  size = "icon",
  className = "",
}: WhatsAppQuickChatProps) {
  const formatted = formatPhoneForWA(phone);
  const msg = buildMessage(customerName, context);
  const url = `https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`;

  return (
    <Button
      variant="ghost"
      size={size}
      className={`text-green-600 hover:text-green-700 hover:bg-green-50 ${size === "icon" ? "h-7 w-7" : "gap-1.5"} ${className}`}
      onClick={() => window.open(url, "_blank")}
      title={`واتساب ${customerName || phone}`}
    >
      <MessageCircle className={size === "icon" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      {size === "sm" && <span>واتساب</span>}
    </Button>
  );
}

export { formatPhoneForWA, buildMessage };
