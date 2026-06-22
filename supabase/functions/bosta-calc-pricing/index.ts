// Calculate Bosta shipping fees for a given destination city.
// Public (no auth) — used by checkout.
// Uses the official Bosta Pricing Annex (1.5A) zone-based rate card.
// Checks the uploaded out-of-coverage list (city + area/district) first,
// then tries Bosta's live pricing API; falls back to the contractual rate
// card so checkout never blocks on a pricing API failure.
//
// Rate card (Forward Delivery, EGP, before VAT) — Pickup from Zone 1:
//   Z1 Cairo & Giza .................. 85
//   Z2 Alexandria + suburbs .......... 92
//   Z3 Delta & Canal ................. 99
//   Z4 Fayoum/BeniSuef/Minya/Asyut/Sohag 114
//   Z5 Qena/Luxor/Aswan/RedSea/Matrouh 131
//   Z6 North Coast ................... 135
//   Z7 Sharm El Sheikh / New Valley .. 151
// + 14% VAT
// + COD fee: 1% of amount exceeding 2000 EGP
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BOSTA_API_KEY = Deno.env.get("BOSTA_API_KEY");
const BOSTA_BASE = "https://app.bosta.co/api/v2";
const VAT_RATE = 0.14;

// Forward Delivery base price per zone (EGP, before VAT)
const ZONE_BASE: Record<number, number> = {
  1: 85, 2: 92, 3: 99, 4: 114, 5: 131, 6: 135, 7: 151,
};

// Map governorate (English name as used by checkout) → Bosta zone
const CITY_TO_ZONE: Record<string, number> = {
  // Zone 1
  Cairo: 1, Giza: 1,
  // Zone 2
  Alexandria: 2,
  // Zone 3 — Delta & Canal
  Qalyubia: 3, Monufia: 3, Sharqia: 3, Gharbia: 3, Dakahlia: 3,
  Beheira: 3, Damietta: 3, "Kafr El Sheikh": 3, "Port Said": 3,
  Ismailia: 3, Suez: 3,
  // Zone 4
  Fayoum: 4, "Beni Suef": 4, Minya: 4, Assiut: 4, Sohag: 4,
  // Zone 5
  Qena: 5, Luxor: 5, Aswan: 5, "Red Sea": 5, Matrouh: 5,
  // Zone 6
  "North Coast": 6,
  // Zone 7
  "South Sinai": 7, "North Sinai": 7, "New Valley": 7,
};

// Out-of-coverage list (July 2025) — uploaded by Al Masria.
// A row with no area/district blocks the entire governorate.
const OUT_OF_COVERAGE: Array<{ govEn: string; areaAr?: string; districtAr?: string }> = [
  { govEn: "Alexandria", areaAr: "الطريق الصحراوي", districtAr: "ابو مسعود" },
  { govEn: "Alexandria", areaAr: "الطريق الصحراوي", districtAr: "الانتاج الاول" },
  { govEn: "Alexandria", areaAr: "الطريق الصحراوي", districtAr: "التفتيش الرابع" },
  { govEn: "Alexandria", areaAr: "الطريق الصحراوي", districtAr: "الثالثه بزور" },
  { govEn: "Alexandria", areaAr: "الطريق الصحراوي", districtAr: "الحريه" },
  { govEn: "Alexandria", areaAr: "الطريق الصحراوي", districtAr: "الحويحى" },
  { govEn: "Alexandria", areaAr: "الطريق الصحراوي", districtAr: "الكبرى الروسى" },
  { govEn: "Alexandria", areaAr: "الطريق الصحراوي", districtAr: "الكفاح" },
  { govEn: "Alexandria", areaAr: "الطريق الصحراوي", districtAr: "المثلث" },
  { govEn: "Alexandria", areaAr: "الطريق الصحراوي", districtAr: "فلسطين" },
  { govEn: "Alexandria", areaAr: "العامريه", districtAr: "عزبه المستعمره" },
  { govEn: "Alexandria", areaAr: "المنتزه", districtAr: "التوفيقيه" },
  { govEn: "Alexandria", areaAr: "المنتزه", districtAr: "حوض 14" },
  { govEn: "Alexandria", areaAr: "المنتزه", districtAr: "حوض 8" },
  { govEn: "Alexandria", areaAr: "النوباريه", districtAr: "فرع 20" },
  { govEn: "Alexandria", areaAr: "النوباريه", districtAr: "قريه ابو اليسر" },
  { govEn: "Alexandria", areaAr: "النوباريه", districtAr: "قريه احمد بدوي" },
  { govEn: "Alexandria", areaAr: "النوباريه", districtAr: "قريه ادم" },
  { govEn: "Alexandria", areaAr: "النوباريه", districtAr: "قريه الشجاعه" },
  { govEn: "Alexandria", areaAr: "النوباريه", districtAr: "قريه الشعراوي" },
  { govEn: "Alexandria", areaAr: "النوباريه", districtAr: "قريه الهجانه" },
  { govEn: "Alexandria", areaAr: "النوباريه", districtAr: "قريه بلال" },
  { govEn: "Alexandria", areaAr: "النوباريه", districtAr: "قريه سليمان" },
  { govEn: "Alexandria", areaAr: "طريق اسكندريه القاهره الصحراوي", districtAr: "بعد كيلو 107" },
  { govEn: "Alexandria", areaAr: "محرم بك", districtAr: "ابيس 05" },
  { govEn: "Alexandria", areaAr: "محرم بك", districtAr: "ابيس 06" },
  { govEn: "Alexandria", areaAr: "محرم بك", districtAr: "ابيس 07" },
  { govEn: "Alexandria", areaAr: "محرم بك", districtAr: "ابيس 08" },
  { govEn: "Alexandria", areaAr: "محرم بك", districtAr: "قريه الجديده" },
  { govEn: "Alexandria", areaAr: "محرم بك", districtAr: "كوبرى العبيد" },
  { govEn: "Alexandria", areaAr: "وادى النطرون", districtAr: "البيضه" },
  { govEn: "Alexandria", areaAr: "وادى النطرون", districtAr: "الياس" },
  { govEn: "Alexandria", areaAr: "وادى النطرون", districtAr: "بنى سلامه" },
  { govEn: "Alexandria", areaAr: "وادى النطرون", districtAr: "قريه الخضراء" },
  { govEn: "Alexandria", areaAr: "وادى النطرون", districtAr: "قريه الشعراوى" },
  { govEn: "Alexandria", areaAr: "وادى النطرون", districtAr: "قريه الشهداء" },
  { govEn: "Alexandria", areaAr: "وادى النطرون", districtAr: "قريه الصديق يوسف" },
  { govEn: "Alexandria", areaAr: "وادى النطرون", districtAr: "قريه الصفا والمروه" },
  { govEn: "Alexandria", areaAr: "وادى النطرون", districtAr: "قريه الطبرانى" },
  { govEn: "Alexandria", areaAr: "وادى النطرون", districtAr: "قريه الهدى والتقوى" },
  { govEn: "Alexandria", areaAr: "وادى النطرون", districtAr: "قريه صلاح العبد" },
  { govEn: "Assiut", areaAr: "الفتح", districtAr: "عرب الكلابات" },
  { govEn: "Assiut", areaAr: "ديروط", districtAr: "الحوطه الشرقيه" },
  { govEn: "Assiut", areaAr: "ساحل سليم", districtAr: "الشاميه" },
  { govEn: "Aswan", areaAr: "ادفو", districtAr: "العدوه شرق" },
  { govEn: "Aswan", areaAr: "ادفو", districtAr: "حاجر ابو خليفه" },
  { govEn: "Aswan", areaAr: "ادفو", districtAr: "حاجر السباعيه ادفو" },
  { govEn: "Aswan", areaAr: "ادفو", districtAr: "حاجر الشهامه ادفو" },
  { govEn: "Aswan", areaAr: "ادفو", districtAr: "حاجر المتميه" },
  { govEn: "Aswan", areaAr: "ادفو", districtAr: "حاجر الميتميه" },
  { govEn: "Aswan", areaAr: "ادفو", districtAr: "وادى عبادى 2" },
  { govEn: "Aswan", areaAr: "ادفو", districtAr: "وادى عبادى 3" },
  { govEn: "Aswan", areaAr: "ادفو", districtAr: "وادى كركر" },
  { govEn: "Aswan", areaAr: "ادفو وادى عبادى", districtAr: "ادفو وادى عبادى" },
  { govEn: "Aswan", areaAr: "اسوان", districtAr: "ابو سمبل السياحي" },
  { govEn: "Aswan", areaAr: "اسوان", districtAr: "كركر" },
  { govEn: "Aswan", areaAr: "كوم امبو", districtAr: "الرغامه" },
  { govEn: "Aswan", areaAr: "كوم امبو", districtAr: "جبل الزلط" },
  { govEn: "Aswan", areaAr: "كوم امبو", districtAr: "عزبه جهنم" },
  { govEn: "Aswan", areaAr: "كوم امبو", districtAr: "قريه الامل" },
  { govEn: "Beheira", areaAr: "ابو المطامير", districtAr: "ابو العدا" },
  { govEn: "Beheira", areaAr: "ابو المطامير", districtAr: "ابو غراره" },
  { govEn: "Beheira", areaAr: "ابو المطامير", districtAr: "الحلاوجه" },
  { govEn: "Beheira", areaAr: "ابو المطامير", districtAr: "الغيته" },
  { govEn: "Beheira", areaAr: "ابو المطامير", districtAr: "سنفا" },
  { govEn: "Beheira", areaAr: "ابو المطامير", districtAr: "قريه الكفاح" },
  { govEn: "Beheira", areaAr: "ابو المطامير", districtAr: "كوم الحنش" },
  { govEn: "Beheira", areaAr: "ابو المطامير", districtAr: "كوم الفرج" },
  { govEn: "Beheira", areaAr: "ابو حمص", districtAr: "بطورس" },
  { govEn: "Beheira", areaAr: "ابو حمص", districtAr: "بلقطر الغربيه" },
  { govEn: "Beheira", areaAr: "ابو حمص", districtAr: "كوبري الزيني" },
  { govEn: "Beheira", areaAr: "ابو حمص", districtAr: "كوم صوان" },
  { govEn: "Beheira", areaAr: "ابوالمطامير", districtAr: "قريه حسن عبدالله" },
  { govEn: "Beheira", areaAr: "اتاي البارود", districtAr: "التوفيقيه" },
  { govEn: "Beheira", areaAr: "اتاي البارود", districtAr: "السعرانيه" },
  { govEn: "Beheira", areaAr: "ادكو", districtAr: "عزبه الجرف" },
  { govEn: "Beheira", areaAr: "ادكو", districtAr: "منشيه دبونو" },
  { govEn: "Beheira", areaAr: "الدلنجات", districtAr: "احمد رامي" },
  { govEn: "Beheira", areaAr: "الدلنجات", districtAr: "الامام الحسيني" },
  { govEn: "Beheira", areaAr: "الدلنجات", districtAr: "الامام الغزالي" },
  { govEn: "Beheira", areaAr: "الدلنجات", districtAr: "البستان" },
  { govEn: "Beheira", areaAr: "الدلنجات", districtAr: "العباسي" },
  { govEn: "Beheira", areaAr: "الدلنجات", districtAr: "زاويه حامور" },
  { govEn: "Beheira", areaAr: "الدلنجات", districtAr: "قريه الامام الغزالى" },
  { govEn: "Beheira", areaAr: "الدلنجات", districtAr: "قريه الامام حسين" },
  { govEn: "Beheira", areaAr: "الدلنجات", districtAr: "كفر الهوايده" },
  { govEn: "Beheira", areaAr: "الدلنجات", districtAr: "كوبري عبد المجيد صالح" },
  { govEn: "Beheira", areaAr: "الدلنجات", districtAr: "منشاءه ميت غمر" },
  { govEn: "Beheira", areaAr: "الدلنجات", districtAr: "موسسه البستان" },
  { govEn: "Beheira", areaAr: "الدلنجات", districtAr: "نجع البراهمه" },
  { govEn: "Beheira", areaAr: "المحموديه", districtAr: "سيدي عقبه" },
  { govEn: "Beheira", areaAr: "المحموديه", districtAr: "عزبه الزهيري" },
  { govEn: "Beheira", areaAr: "المحموديه", districtAr: "عزبه الشركه" },
  { govEn: "Beheira", areaAr: "المحموديه", districtAr: "عزبه مفتاح" },
  { govEn: "Beheira", areaAr: "المحموديه", districtAr: "فيشا الصفرا" },
  { govEn: "Beheira", areaAr: "المحموديه", districtAr: "قريه السعداوي" },
  { govEn: "Beheira", areaAr: "حوش عيسى", districtAr: "توفيق الحكيم" },
  { govEn: "Beheira", areaAr: "دلنجات", districtAr: "البستان" },
  { govEn: "Beheira", areaAr: "رشيد", districtAr: "ديبي" },
  { govEn: "Beheira", areaAr: "رشيد", districtAr: "محله الامير" },
  { govEn: "Beheira", areaAr: "غرب النوباريه", districtAr: "غرب النوباريه" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "ابيس 05" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "ابيس 06" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "ابيس 07" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "ابيس 08" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "ابيس 3" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "البسلقون" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "التمامه" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "الحاجر" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "الديابه" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "السبعين" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "الصحاره" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "الطريق الدولي بالكامل" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "العالي" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "العرقوب" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "الكراكول" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "الكربون" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "الكنايس" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "الكنياس" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "الكوبري التاني من الطريق الدولي" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "الملقه" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "سرياح" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "طرمبات" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "طريق ليزا شارلوا" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "عزب دفشو" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "عزبه 5" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "عزبه دفشو" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "عزبه زلط" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "عزبه محمود" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "عزبه معتوق" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "قري خط تحيمر" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "قريه عبدالصادق" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "قريه مختار" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "قريه يسري" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "كوبري العبد" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "كوم اشو" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "كوم القرع" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "ليزا" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "منشاه ابو قير" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "منشاه الهلباوي" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "منشاه الوكيل" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "منشاه بسيوني" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "منشاه بلبع" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "منشاه عامر" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "منشاه فاضل" },
  { govEn: "Beheira", areaAr: "كفر الدوار", districtAr: "منشاه يونس" },
  { govEn: "Beheira", areaAr: "كوم حماده", districtAr: "احمد عرابى" },
  { govEn: "Beheira", areaAr: "كوم حماده", districtAr: "الزعفراني" },
  { govEn: "Beheira", areaAr: "كوم حماده", districtAr: "الشروق النعناعي" },
  { govEn: "Beheira", areaAr: "كوم حماده", districtAr: "امام مالك" },
  { govEn: "Beheira", areaAr: "كوم حماده", districtAr: "عبدالحميد ابوزيد" },
  { govEn: "Beheira", areaAr: "كوم حماده", districtAr: "نتما" },
  { govEn: "Beheira", areaAr: "محموديه", districtAr: "منشاه اريمون" },
  { govEn: "Beheira", areaAr: "مركز بدر", districtAr: "التحدي" },
  { govEn: "Beheira", areaAr: "مركز بدر", districtAr: "الخرطوم" },
  { govEn: "Beheira", areaAr: "مركز بدر", districtAr: "الشروق" },
  { govEn: "Beheira", areaAr: "مركز بدر", districtAr: "المجد" },
  { govEn: "Beheira", areaAr: "مركز بدر", districtAr: "النعناعي" },
  { govEn: "Beheira", areaAr: "مركز بدر", districtAr: "طريق المطار" },
  { govEn: "Beheira", areaAr: "مركز بدر", districtAr: "عز الدين" },
  { govEn: "Beheira", areaAr: "مطوبس", districtAr: "السيد البدوي" },
  { govEn: "Beheira", areaAr: "مطوبس", districtAr: "المنطقه الصناعيه" },
  { govEn: "Beheira", areaAr: "مطوبس", districtAr: "برج مغيزل" },
  { govEn: "Beheira", areaAr: "مطوبس", districtAr: "بركه غليون" },
  { govEn: "Beheira", areaAr: "مطوبس", districtAr: "قريه النور" },
  { govEn: "Beheira", areaAr: "مطوبس", districtAr: "لجزيره الخضرا" },
  { govEn: "Beheira", areaAr: "وادي النطرون", districtAr: "قريه الامام مالك" },
  { govEn: "Beheira", areaAr: "وادي النطرون", districtAr: "قريه بنى سلامه" },
  { govEn: "Beni Suef", areaAr: "مركز الفشن", districtAr: "قريه 1و2و3والصحراوي الغربي" },
  { govEn: "Beni Suef", areaAr: "مركز الواسطي", districtAr: "منتجع الاسيوطي والصحراوي الغربي" },
  { govEn: "Beni Suef", areaAr: "مركز اهناسيا", districtAr: "البهسمون وطما فيوم ومنيل غيضان والشريف ومنشيه طاهر ونزله خلف والطيور" },
  { govEn: "Beni Suef", areaAr: "مركز ببا", districtAr: "غياضه الشرقيه وجبل النور" },
  { govEn: "Beni Suef", areaAr: "مركز بنى سويف", districtAr: "سنور" },
  { govEn: "Beni Suef", areaAr: "مركز بنى سويف", districtAr: "كمين المثلث ومحطه الكهرباء والقريه الزكيه ومصنع الاسمنت" },
  { govEn: "Beni Suef", areaAr: "مركز سمسطا", districtAr: "قريه 1و2و3والصحراوي الغربي" },
  { govEn: "Beni Suef", areaAr: "مركز ناصر", districtAr: "عزبه علي حموده والورشه وجزيره ابو صالح وبني خليفه والحرجه" },
  { govEn: "Dakahlia", areaAr: "الجماليه", districtAr: "كوبرى ميشا" },
  { govEn: "Fayoum", areaAr: "اطسا", districtAr: "قريه الخمسين" },
  { govEn: "Fayoum", areaAr: "اطسا", districtAr: "قريه الموالك" },
  { govEn: "Fayoum", areaAr: "اطسا", districtAr: "قريه مينا" },
  { govEn: "Gharbia", areaAr: "بلطيم", districtAr: "الدولى الساحلى" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "الحايظ" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "الحره" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "الصحراء السوداء" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "العواينه" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "العين الغربيه" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "الواحات البحريه" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "باويتي" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "رالي الفراعنه" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "عين البليده" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "عين الحصوي" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "عين الحلفايه" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "عين العز" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "عين الوادي" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "عين خمان" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "عيون تابليمون" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "مزرعه اسامه سعيد محمد" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "مزرعه وليد عبد الهادي" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "منديشه" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "مواشي انماء" },
  { govEn: "Giza", areaAr: "الواحات البحريه", districtAr: "واحه بحريه" },
  { govEn: "Giza", areaAr: "طريق القاهره الاسكندريه الصحراوي", districtAr: "بعد الكيلو 28" },
  { govEn: "Giza", areaAr: "طريق القاهره الاسكندريه الصحراوي", districtAr: "طريق القاهره الاسكندريه الصحراوي" },
  { govEn: "Ismailia", areaAr: "التل الكبير", districtAr: "الجبل الاخضر في التل الكبير" },
  { govEn: "Ismailia", areaAr: "التل الكبير", districtAr: "الهيش في التل الكبير" },
  { govEn: "Ismailia", areaAr: "القنطره شرق", districtAr: "القنطره شرق" },
  { govEn: "Ismailia", areaAr: "خارج الاسماعيليه", districtAr: "العزب على طريق القنطر" },
  { govEn: "Ismailia", areaAr: "خارج الاسماعيليه", districtAr: "خارج الاسماعيليه" },
  { govEn: "Ismailia", areaAr: "خارج الاسماعيليه", districtAr: "سرابيوم الصحراوي" },
  { govEn: "Ismailia", areaAr: "خارج الاسماعيليه", districtAr: "عجرود" },
  { govEn: "Ismailia", areaAr: "طريق الاسماعيليه الصحراوي", districtAr: "بعد الكارته" },
  { govEn: "Ismailia", areaAr: "مركز الاسماعيليه", districtAr: "السحر والجمال" },
  { govEn: "Ismailia", areaAr: "مركز الاسماعيليه", districtAr: "صحراء ابوصوير" },
  { govEn: "Kafr El Sheikh", areaAr: undefined, districtAr: "الملاحه" },
  { govEn: "Kafr El Sheikh", areaAr: undefined, districtAr: "كفر قته" },
  { govEn: "Kafr El Sheikh", areaAr: "بيلا", districtAr: "روس الفرخ" },
  { govEn: "Kafr El Sheikh", areaAr: "سيدى سالم", districtAr: "الروضه" },
  { govEn: "Kafr El Sheikh", areaAr: "سيدى سالم", districtAr: "الشخلوبه" },
  { govEn: "Kafr El Sheikh", areaAr: "مطوبس", districtAr: "خليج بحرى" },
  { govEn: "Kafr El Sheikh", areaAr: "مطوبس", districtAr: "خليج قبلى" },
  { govEn: "Luxor", areaAr: "قامولا", districtAr: "قامولا" },
  { govEn: "Matrouh", areaAr: "السلوم", districtAr: "السلوم" },
  { govEn: "Matrouh", areaAr: "النجيله", districtAr: "النجيله" },
  { govEn: "Matrouh", areaAr: "براني", districtAr: "براني" },
  { govEn: "Matrouh", areaAr: "سيدي براني", districtAr: "سيدي براني" },
  { govEn: "Matrouh", areaAr: "سيوه", districtAr: "سيوه" },
  { govEn: "Minya", areaAr: "ابو قرقاص", districtAr: "بني حسن الشروق" },
  { govEn: "Minya", areaAr: "العدوه", districtAr: "قريه 4" },
  { govEn: "Minya", areaAr: "المنيا الجديده", districtAr: "المنطقه الصناعيه" },
  { govEn: "Minya", areaAr: "سمالوط", districtAr: "جبل الطير" },
  { govEn: "Minya", areaAr: "سمالوط", districtAr: "من قريه 1 الى قريه 8" },
  { govEn: "Minya", areaAr: "مغاغه", districtAr: "التحرير" },
  { govEn: "Monufia", areaAr: "طريق القاهره الاسكندريه الصحراوي", districtAr: "طريق القاهره الاسكندريه الصحراوي" },
  { govEn: "New Valley", areaAr: "الفرافره", districtAr: "الفرافره" },
  { govEn: "North Sinai", areaAr: undefined, districtAr: undefined },
  { govEn: "Port Said", areaAr: "شرق التفريعه", districtAr: "شرق التفريعه" },
  { govEn: "Qena", areaAr: "نجع حمادي", districtAr: "ابو حزام" },
  { govEn: "Qena", areaAr: "نجع حمادي", districtAr: "عزبه البوصه" },
  { govEn: "Qena", areaAr: "نجع حمادي", districtAr: "قريه حمرا دوم" },
  { govEn: "Qena", areaAr: "نقاده", districtAr: "اسمنت" },
  { govEn: "Qena", areaAr: "نقاده", districtAr: "العربات" },
  { govEn: "Qena", areaAr: "نقاده", districtAr: "صوص" },
  { govEn: "Qena", areaAr: "نقاده", districtAr: "قامولا" },
  { govEn: "Red Sea", areaAr: "الشلاتين", districtAr: "الشلاتين" },
  { govEn: "Sharqia", areaAr: "الحسينيه", districtAr: "الظواهريه" },
  { govEn: "Sharqia", areaAr: "الحسينيه", districtAr: "تيمور" },
  { govEn: "Sharqia", areaAr: "الحسينيه", districtAr: "قريه طارق بن زياد" },
  { govEn: "Sharqia", areaAr: "الصالحيه", districtAr: "ابوكبيش" },
  { govEn: "Sharqia", areaAr: "الصالحيه", districtAr: "مفارق المطار" },
  { govEn: "Sharqia", areaAr: "الصالحيه", districtAr: "مفارق خضير" },
  { govEn: "Sharqia", areaAr: "اولاد صقر", districtAr: "جزيره الشافعي" },
  { govEn: "Sharqia", areaAr: "اولاد صقر", districtAr: "جزيره مطاوع" },
  { govEn: "Sharqia", areaAr: "بلبيس", districtAr: "السجن الجديد" },
  { govEn: "Sharqia", areaAr: "بلبيس", districtAr: "المظلات" },
  { govEn: "Sharqia", areaAr: "بلبيس", districtAr: "المهندسين العرب" },
  { govEn: "Sharqia", areaAr: "بلبيس", districtAr: "بلبيس الصناعيه" },
  { govEn: "Sharqia", areaAr: "بلبيس", districtAr: "طريق بلبيس الصحراوى" },
  { govEn: "Sharqia", areaAr: "بلبيس", districtAr: "منطقه انشاص الصناعيه" },
  { govEn: "Sohag", areaAr: "جرجا", districtAr: "بيت علام" },
  { govEn: "Sohag", areaAr: "دار السلام", districtAr: "البلابيش المستجده" },
];

const GOV_EN_ALIASES: Record<string, string> = {
  sharkia: "Sharqia",
  portsaid: "Port Said",
  benisuef: "Beni Suef",
  banisuif: "Beni Suef",
  kafrelsheikh: "Kafr El Sheikh",
  kafralsheikh: "Kafr El Sheikh",
  redsea: "Red Sea",
  newvalley: "New Valley",
  southsinai: "South Sinai",
  northsinai: "North Sinai",
  marsamatrouh: "Matrouh",
  assuit: "Assiut",
  menya: "Minya",
  menoufia: "Monufia",
};

function canonicalGovEn(s: string): string {
  const key = s.toLowerCase().replace(/[^a-z]/g, "");
  return GOV_EN_ALIASES[key] ?? s.replace(/\s+/g, " ").trim();
}

function normalizeAr(s: string): string {
  const eastern = "٠١٢٣٤٥٦٧٨٩";
  const western = "0123456789";
  let out = s;
  for (let i = 0; i < eastern.length; i++) {
    out = out.split(eastern[i]).join(western[i]);
  }
  return out
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[^\u0600-\u06FF0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isOutOfCoverage(
  dropOffCity: string,
  dropOffAreaAr = "",
  dropOffAddressAr = "",
): boolean {
  const city = canonicalGovEn(dropOffCity);
  const hay = normalizeAr(`${dropOffAreaAr} ${dropOffAddressAr}`);
  return OUT_OF_COVERAGE.some((row) => {
    if (canonicalGovEn(row.govEn) !== city) return false;
    const area = row.areaAr ? normalizeAr(row.areaAr) : "";
    const district = row.districtAr ? normalizeAr(row.districtAr) : "";
    if (!area && !district) return true;
    if (area && hay.includes(area)) return true;
    if (district && hay.includes(district)) return true;
    return false;
  });
}

async function tryFetch(path: string, body: Record<string, unknown>) {
  const res = await fetch(`${BOSTA_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": BOSTA_API_KEY! },
    body: JSON.stringify(body),
  });
  const raw = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, raw };
}

function extractFee(raw: any): number | null {
  return raw?.data?.shipmentFees ?? raw?.data?.priceBeforeVat ?? raw?.data?.price
    ?? raw?.shipmentFees ?? raw?.price ?? raw?.data?.total ?? null;
}

function calcCodFee(cod: number): number {
  if (!cod || cod <= 2000) return 0;
  return Math.round((cod - 2000) * 0.01);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const {
      dropOffCity,
      dropOffAreaAr = "",
      dropOffAddressAr = "",
      pickupCity = "Cairo",
      cod = 0,
      size = "Normal",
      type = 10,
    } = body || {};

    if (!dropOffCity) {
      return new Response(JSON.stringify({ error: "dropOffCity required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isOutOfCoverage(dropOffCity, dropOffAreaAr, dropOffAddressAr)) {
      return new Response(JSON.stringify({
        success: false,
        out_of_coverage: true,
        error: "المنطقة المختارة خارج تغطية Bosta. يمكنك اختيار «استلام من الفرع».",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let fee: number | null = null;
    let lastError: any = null;

    if (BOSTA_API_KEY) {
      const attempts = [
        { path: "/pricing/shipment-fees", body: { dropOffCity, pickupCity, cod, size, type } },
        { path: "/pricing/calculator",   body: { dropOffCity, pickupCity, cod, size, type } },
        { path: "/pricing/shipment",     body: { dropOffCity, pickupCity, cod, size, type } },
        { path: "/deliveries/pricing",   body: { dropOffCity, pickupCity, cod, size, type } },
      ];
      for (const a of attempts) {
        try {
          const r = await tryFetch(a.path, a.body);
          if (r.ok) { fee = extractFee(r.raw); if (fee != null) break; }
          else lastError = { path: a.path, status: r.status, details: r.raw };
        } catch (e) { lastError = String(e); }
      }
    }

    let source: "bosta" | "rate_card" = "bosta";
    let zone: number | null = null;
    let baseFee = 0;
    let vat = 0;
    let codFee = 0;

    if (fee == null) {
      source = "rate_card";
      zone = CITY_TO_ZONE[canonicalGovEn(dropOffCity)] ?? 3;
      baseFee = ZONE_BASE[zone];
      vat = Math.round(baseFee * VAT_RATE);
      codFee = calcCodFee(Number(cod) || 0);
      fee = baseFee + vat + codFee;
    }

    return new Response(JSON.stringify({
      success: true, fee, source, zone, baseFee, vat, codFee, lastError,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});