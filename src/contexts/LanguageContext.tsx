import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { defaultTranslations, Lang } from "./translations";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  dir: "rtl" | "ltr";
  isAr: boolean;
  refreshTranslations: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("app-lang");
    return (saved === "en" ? "en" : "ar") as Lang;
  });

  // Overrides loaded from DB (admin-edited values)
  const [overrides, setOverrides] = useState<Record<Lang, Record<string, string>>>({
    ar: {},
    en: {},
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("app-lang", newLang);
  };

  const refreshTranslations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("ui_translations")
        .select("key, value_ar, value_en");
      if (error || !data) return;
      const ar: Record<string, string> = {};
      const en: Record<string, string> = {};
      for (const row of data) {
        if (row.value_ar) ar[row.key] = row.value_ar;
        if (row.value_en) en[row.key] = row.value_en;
      }
      setOverrides({ ar, en });
    } catch {
      // Silent fail — defaults will be used
    }
  }, []);

  useEffect(() => {
    refreshTranslations();
  }, [refreshTranslations]);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: string): string => {
    return (
      overrides[lang][key] ||
      defaultTranslations[lang][key] ||
      overrides["ar"][key] ||
      defaultTranslations["ar"][key] ||
      key
    );
  };

  return (
    <LanguageContext.Provider
      value={{
        lang,
        setLang,
        t,
        dir: lang === "ar" ? "rtl" : "ltr",
        isAr: lang === "ar",
        refreshTranslations,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
