/** Typed view over src/data/seoShared.js (shared with the build scripts). */
import { MODELS, TYPES, BRANCHES } from "./seoShared.js";

export interface SeoModel { slug: string; ar: string; en: string }
export interface SeoType { slug: string; ar: string; en: string }
export interface SeoBranch {
  slug: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  hours: string;
}

export const SEO_MODELS: SeoModel[] = MODELS;
export const SEO_TYPES: SeoType[] = TYPES;
export const SEO_BRANCHES: SeoBranch[] = BRANCHES;
