import { supabase } from "@/integrations/supabase/client";
import { getPhoneAuthEmailCandidates } from "@/lib/phoneAuth";

export const buildLoginEmailCandidates = (identifier: string, treatAsPhone: boolean) => {
  const trimmedIdentifier = identifier.trim();
  if (!trimmedIdentifier) return [] as string[];

  return treatAsPhone ? getPhoneAuthEmailCandidates(trimmedIdentifier) : [trimmedIdentifier];
};

export const signInWithPossibleEmails = async (emailCandidates: string[], password: string) => {
  let lastResult: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>> | null = null;

  for (const email of emailCandidates) {
    const result = await supabase.auth.signInWithPassword({ email, password });

    if (!result.error) {
      return result;
    }

    lastResult = result;

    if (!/invalid login credentials/i.test(result.error.message)) {
      return result;
    }
  }

  if (!lastResult) {
    throw new Error("No email candidates were provided for sign-in.");
  }

  return lastResult;
};