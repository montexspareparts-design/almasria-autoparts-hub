import { supabase } from "@/integrations/supabase/client";
import { getPhoneAuthEmailCandidates } from "@/lib/phoneAuth";

export const buildLoginEmailCandidates = (identifier: string, treatAsPhone: boolean) => {
  const trimmedIdentifier = identifier.trim();
  if (!trimmedIdentifier) return [] as string[];

  return treatAsPhone ? getPhoneAuthEmailCandidates(trimmedIdentifier) : [trimmedIdentifier];
};

type SignInResult = Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;

/**
 * Iterate through phone/email candidates. NEVER throws — network / unexpected
 * exceptions are wrapped into a fake `{ error }` result so the caller always
 * receives a normal Supabase-style response and can display a proper toast
 * instead of bubbling up to the global ErrorBoundary.
 */
export const signInWithPossibleEmails = async (
  emailCandidates: string[],
  password: string,
): Promise<SignInResult> => {
  let lastResult: SignInResult | null = null;

  for (const email of emailCandidates) {
    let result: SignInResult;
    try {
      result = await supabase.auth.signInWithPassword({ email, password });
    } catch (e: any) {
      result = {
        data: { user: null, session: null } as any,
        error: {
          name: "AuthRetryableFetchError",
          message: e?.message || "Network error",
          status: 0,
        } as any,
      };
    }

    if (!result.error) return result;
    lastResult = result;

    if (!/invalid login credentials/i.test(result.error.message)) {
      return result;
    }
  }

  if (!lastResult) {
    return {
      data: { user: null, session: null } as any,
      error: {
        name: "AuthApiError",
        message: "Invalid login credentials",
        status: 400,
      } as any,
    };
  }

  return lastResult;
};
