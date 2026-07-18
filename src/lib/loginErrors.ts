/**
 * Central mapper: converts any Supabase auth error / thrown exception into a
 * safe, user-friendly Arabic message. Never exposes raw backend errors.
 */
export const mapLoginError = (err: any): { title: string; description?: string } => {
  const raw = String(err?.message || err || "").toLowerCase();

  if (!raw || /network|failed to fetch|load failed|fetch error|timeout|networkerror/.test(raw)) {
    if (!raw) {
      return {
        title: "تعذر تسجيل الدخول الآن",
        description: "يرجى المحاولة مرة أخرى.",
      };
    }
    return {
      title: "تعذر الاتصال بالخادم",
      description: "تحقق من اتصال الإنترنت وحاول مرة أخرى.",
    };
  }

  if (/invalid login credentials|invalid_grant|invalid credentials/.test(raw)) {
    return { title: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
  }

  if (/email not confirmed|not confirmed/.test(raw)) {
    return { title: "يرجى تأكيد البريد الإلكتروني أولاً." };
  }

  if (/user not found|no user found/.test(raw)) {
    return { title: "لا يوجد حساب بهذه البيانات." };
  }

  if (/too many|rate limit/.test(raw)) {
    return {
      title: "تم تجاوز عدد المحاولات",
      description: "انتظر قليلاً ثم حاول مرة أخرى.",
    };
  }

  return {
    title: "تعذر تسجيل الدخول الآن",
    description: "يرجى المحاولة مرة أخرى.",
  };
};
