import { useState, useEffect, useCallback } from "react";

const CONSENT_KEY = "almasria_personalization_consent";
const INTERESTS_KEY = "almasria_user_interests";

export interface UserInterests {
  viewedCategories: Record<string, number>; // categoryId -> count
  viewedBrands: Record<string, number>; // brand -> count
  searchTerms: string[];
  lastViewedProducts: string[]; // product IDs, max 20
}

const defaultInterests: UserInterests = {
  viewedCategories: {},
  viewedBrands: {},
  searchTerms: [],
  lastViewedProducts: [],
};

export const usePersonalization = () => {
  const [consent, setConsentState] = useState<boolean | null>(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    return stored === null ? null : stored === "true";
  });

  const [interests, setInterests] = useState<UserInterests>(() => {
    try {
      const stored = localStorage.getItem(INTERESTS_KEY);
      return stored ? JSON.parse(stored) : defaultInterests;
    } catch {
      return defaultInterests;
    }
  });

  useEffect(() => {
    if (consent) {
      localStorage.setItem(INTERESTS_KEY, JSON.stringify(interests));
    }
  }, [interests, consent]);

  const grantConsent = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "true");
    setConsentState(true);
  }, []);

  const denyConsent = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "false");
    setConsentState(false);
  }, []);

  const trackCategory = useCallback((categoryId: string) => {
    if (!consent) return;
    setInterests((prev) => ({
      ...prev,
      viewedCategories: {
        ...prev.viewedCategories,
        [categoryId]: (prev.viewedCategories[categoryId] || 0) + 1,
      },
    }));
  }, [consent]);

  const trackBrand = useCallback((brand: string) => {
    if (!consent) return;
    setInterests((prev) => ({
      ...prev,
      viewedBrands: {
        ...prev.viewedBrands,
        [brand]: (prev.viewedBrands[brand] || 0) + 1,
      },
    }));
  }, [consent]);

  const trackSearch = useCallback((term: string) => {
    if (!consent || !term.trim()) return;
    setInterests((prev) => ({
      ...prev,
      searchTerms: [term, ...prev.searchTerms.filter((t) => t !== term)].slice(0, 10),
    }));
  }, [consent]);

  const trackProductView = useCallback((productId: string) => {
    if (!consent) return;
    setInterests((prev) => ({
      ...prev,
      lastViewedProducts: [productId, ...prev.lastViewedProducts.filter((id) => id !== productId)].slice(0, 20),
    }));
  }, [consent]);

  const getTopCategories = useCallback((limit = 3): string[] => {
    return Object.entries(interests.viewedCategories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([id]) => id);
  }, [interests.viewedCategories]);

  const getTopBrands = useCallback((limit = 2): string[] => {
    return Object.entries(interests.viewedBrands)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([brand]) => brand);
  }, [interests.viewedBrands]);

  return {
    consent,
    interests,
    grantConsent,
    denyConsent,
    trackCategory,
    trackBrand,
    trackSearch,
    trackProductView,
    getTopCategories,
    getTopBrands,
  };
};
