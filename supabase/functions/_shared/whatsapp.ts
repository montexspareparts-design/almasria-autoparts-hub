const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export type WhatsAppSendResult = {
  ok: boolean;
  formattedPhone: string;
  messageId: string | null;
  data: any;
  error?: string;
  errorCode?: string | number;
  errorType?: string;
  requiresTemplate?: boolean;
};

export function formatEgyptianPhone(phone: string): string {
  let formatted = phone.replace(/[\s\-()+]/g, "");

  if (formatted.startsWith("00")) {
    formatted = formatted.slice(2);
  }

  if (formatted.startsWith("0")) {
    formatted = `20${formatted.slice(1)}`;
  }

  if (/^1\d{9}$/.test(formatted)) {
    formatted = `20${formatted}`;
  }

  return formatted;
}

function getTemplateRequirement(data: any, fallbackMessage: string) {
  const code = data?.error?.code ?? data?.error?.error_subcode;
  const message = String(data?.error?.message || fallbackMessage || "").toLowerCase();

  return (
    code === 470 ||
    code === 131047 ||
    code === 131051 ||
    message.includes("24-hour") ||
    message.includes("outside the allowed window") ||
    message.includes("message template") ||
    message.includes("re-engagement")
  );
}

export async function sendWhatsAppPayload(
  phone: string,
  payload: Record<string, unknown>,
): Promise<WhatsAppSendResult> {
  const accessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");

  if (!accessToken) {
    return {
      ok: false,
      formattedPhone: formatEgyptianPhone(phone),
      messageId: null,
      data: null,
      error: "META_WHATSAPP_ACCESS_TOKEN is not configured",
    };
  }

  if (!phoneNumberId) {
    return {
      ok: false,
      formattedPhone: formatEgyptianPhone(phone),
      messageId: null,
      data: null,
      error: "META_WHATSAPP_PHONE_NUMBER_ID is not configured",
    };
  }

  const formattedPhone = formatEgyptianPhone(phone);
  const response = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      ...payload,
    }),
  });

  const rawText = await response.text();
  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = { raw: rawText };
  }
  const messageId = data?.messages?.[0]?.id ?? null;

  if (!response.ok) {
    const error = data?.error?.message || rawText || `HTTP ${response.status}`;
    return {
      ok: false,
      formattedPhone,
      messageId,
      data,
      error,
      errorCode: data?.error?.code ?? data?.error?.error_subcode,
      errorType: data?.error?.type,
      requiresTemplate: getTemplateRequirement(data, error),
    };
  }

  return {
    ok: true,
    formattedPhone,
    messageId,
    data,
  };
}

export async function sendWhatsAppText(phone: string, body: string) {
  return sendWhatsAppPayload(phone, {
    type: "text",
    text: {
      preview_url: false,
      body,
    },
  });
}