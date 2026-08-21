/** Mirrors scripts/seo-routes.mjs — keep both in sync. */

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

export const SEO_MODELS: SeoModel[] = [
  { slug: "hiace", ar: "هايس", en: "Hiace" },
  { slug: "coaster", ar: "كوستر", en: "Coaster" },
  { slug: "hilux", ar: "هايلوكس", en: "Hilux" },
  { slug: "land-cruiser", ar: "لاند كروزر", en: "Land Cruiser" },
  { slug: "yaris", ar: "ياريس", en: "Yaris" },
  { slug: "rav4", ar: "راف فور", en: "RAV4" },
  { slug: "fortuner", ar: "فورتشنر", en: "Fortuner" },
  { slug: "rush", ar: "رش", en: "Rush" },
  { slug: "corolla", ar: "كورولا", en: "Corolla" },
  { slug: "camry", ar: "كامري", en: "Camry" },
  { slug: "rumion", ar: "روميون", en: "Rumion" },
];

export const SEO_TYPES: SeoType[] = [
  { slug: "filters", ar: "فلاتر", en: "Filters" },
  { slug: "oils", ar: "زيوت وسوائل", en: "Oils & Fluids" },
  { slug: "brakes", ar: "فرامل", en: "Brakes" },
  { slug: "suspension", ar: "عفشة وتعليق", en: "Suspension" },
  { slug: "electrical", ar: "كهرباء", en: "Electrical" },
  { slug: "engine", ar: "قطع محرك", en: "Engine" },
  { slug: "cooling", ar: "تبريد", en: "Cooling" },
];

export const SEO_BRANCHES: SeoBranch[] = [
  {
    slug: "osim",
    name: "فرع أوسيم",
    city: "الجيزة",
    address: "أوسيم، الجيزة، مصر",
    phone: "+201020412358",
    hours: "السبت – الخميس، 9 صباحًا – 6 مساءً",
  },
  {
    slug: "tawfikia",
    name: "فرع التوفيقية",
    city: "القاهرة",
    address: "التوفيقية، وسط البلد، القاهرة، مصر",
    phone: "+201034806288",
    hours: "السبت – الخميس، 9 صباحًا – 6 مساءً",
  },
  {
    slug: "luxor",
    name: "فرع الأقصر",
    city: "الأقصر",
    address: "الأقصر، مصر",
    phone: "+201020412358",
    hours: "السبت – الخميس، 9 صباحًا – 6 مساءً",
  },
];
