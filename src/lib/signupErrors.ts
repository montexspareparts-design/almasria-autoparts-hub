// Central Arabic mapper for signup/auth errors.
// Never expose raw Supabase messages to end users. Always log technical detail
// via console for debugging, then return one of the approved Arabic strings.

export const SIGNUP_MESSAGES = {
  emailExists:
    "هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول أو استخدام بريد آخر.",
  phoneExists:
    "رقم الهاتف مسجل بالفعل. يرجى استخدام رقم آخر أو تسجيل الدخول.",
  invalidEmail: "يرجى إدخال بريد إلكتروني صحيح.",
  invalidPhone:
    "يرجى إدخال رقم موبايل مصري صحيح يبدأ بـ 01 ويتكون من 11 رقم.",
  weakPassword:
    "كلمة المرور يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف ورقم.",
  passwordMismatch: "كلمتا المرور غير متطابقتين.",
  missingField: "يرجى استكمال جميع البيانات المطلوبة.",
  duplicateApplication: "يوجد طلب تاجر مسجل بالفعل بهذه البيانات.",
  network: "تعذر إتمام التسجيل الآن. يرجى المحاولة مرة أخرى.",
  fallback:
    "حدث خطأ أثناء التسجيل. يرجى مراجعة البيانات والمحاولة مرة أخرى.",
} as const;

const NETWORK_HINTS = [
  "failed to fetch",
  "network",
  "networkerror",
  "load failed",
  "timeout",
  "connection",
  "socket",
  "err_internet",
  "err_network",
];

export function mapAuthError(err: unknown): string {
  const raw =
    (err as any)?.message ??
    (err as any)?.error_description ??
    (typeof err === "string" ? err : "");
  const code = String((err as any)?.code ?? "").toLowerCase();
  const msg = String(raw || "").toLowerCase();

  if (!msg && !code) return SIGNUP_MESSAGES.fallback;

  if (
    msg.includes("already registered") ||
    msg.includes("already been registered") ||
    msg.includes("user already exists") ||
    msg.includes("duplicate key") ||
    code === "user_already_exists" ||
    code === "email_exists"
  ) {
    return SIGNUP_MESSAGES.emailExists;
  }

  if (msg.includes("phone") && (msg.includes("exists") || msg.includes("taken"))) {
    return SIGNUP_MESSAGES.phoneExists;
  }

  if (
    msg.includes("invalid email") ||
    msg.includes("email address") && msg.includes("invalid") ||
    code === "email_address_invalid"
  ) {
    return SIGNUP_MESSAGES.invalidEmail;
  }

  if (
    msg.includes("password") &&
    (msg.includes("weak") ||
      msg.includes("short") ||
      msg.includes("at least") ||
      msg.includes("pwned") ||
      msg.includes("leaked") ||
      code === "weak_password")
  ) {
    return SIGNUP_MESSAGES.weakPassword;
  }

  if (NETWORK_HINTS.some((h) => msg.includes(h))) {
    return SIGNUP_MESSAGES.network;
  }

  if (msg.includes("row-level security") || msg.includes("permission")) {
    return SIGNUP_MESSAGES.fallback;
  }

  return SIGNUP_MESSAGES.fallback;
}

export function logSignupError(context: string, err: unknown) {
  // Safe technical logging — never surfaced to the user.
  try {
    console.error(`[signup:${context}]`, {
      message: (err as any)?.message,
      code: (err as any)?.code,
      status: (err as any)?.status,
      name: (err as any)?.name,
    });
  } catch {
    // ignore logging failures
  }
}
