/**
 * Bilingual SEO meta for product CATEGORIES (filters, suspension,
 * brakes, electrical, cooling, engine internals, oils, …).
 *
 * Every category page needs three things to rank for high-intent
 * Toyota part queries:
 *   1. A title that combines the part type + the brand cue ("تويوتا
 *      الأصلية" / "Toyota Genuine") + an Egypt geo cue.
 *   2. A description packed with concrete part names and SKU-style
 *      hints so Google can match long-tail queries like
 *      "فلتر زيت كورولا 2018 SKU 90915-YZZD2".
 *   3. Keywords that mix Arabic + English + common SKU prefixes used
 *      across our DENSO / AISIN / Toyota Genuine catalog.
 *
 * Keyed by the ACTUAL slugs that exist in `product_categories.slug`
 * (verified via DB query). Aliases below let legacy URLs like
 * `/parts-by-type/oils` and `/parts-by-type/engine` keep working.
 */

export interface CategorySEOMeta {
  /** Canonical category slug (matches product_categories.slug). */
  slug: string;
  nameAr: string;
  nameEn: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  keywordsAr: string;
  keywordsEn: string;
  /** Toyota models commonly served by parts in this category. */
  models: string[];
}

// ─────────────────────────────────────────────────────────────────────
// Master table — ONE entry per real category slug in the database.
// Keep titles ≤ ~60 chars and descriptions ≤ 160 chars (post-clamp).
// ─────────────────────────────────────────────────────────────────────
export const CATEGORY_SEO: Record<string, CategorySEOMeta> = {
  filters: {
    slug: "filters",
    nameAr: "فلاتر",
    nameEn: "Filters",
    titleAr: "فلاتر تويوتا الأصلية في مصر | زيت وهواء وبنزين OEM",
    titleEn: "Toyota Genuine Filters Egypt | Oil, Air, Fuel & Cabin",
    descriptionAr:
      "فلاتر تويوتا الأصلية والبدائل المعتمدة (DENSO، AISIN، MTX): فلتر زيت 90915-YZZD2، فلتر هواء، فلتر بنزين/ديزل، فلتر مكيف. يناسب كورولا، كامري، هايلوكس، لاند كروزر، هايس، فورتشنر، ياريس وراف 4.",
    descriptionEn:
      "Toyota genuine filters & approved alternatives (DENSO, AISIN, MTX): oil filter 90915-YZZD2, air, fuel/diesel and cabin filters. Fits Corolla, Camry, Hilux, Land Cruiser, Hiace, Fortuner, Yaris and RAV4.",
    keywordsAr:
      "فلاتر تويوتا, فلتر زيت تويوتا, فلتر هواء تويوتا, فلتر بنزين, فلتر مكيف, 90915-YZZD2, فلاتر كورولا, فلاتر هايلوكس, DENSO فلاتر, AISIN فلاتر",
    keywordsEn:
      "Toyota filters Egypt, Toyota oil filter, 90915-YZZD2, Toyota air filter, Toyota cabin filter, DENSO filters, AISIN filters, Corolla filter, Hilux filter, Land Cruiser filter",
    models: ["Corolla", "Camry", "Hilux", "Land Cruiser", "Hiace", "Fortuner", "Yaris", "RAV4", "Coaster", "Rush"],
  },

  suspension: {
    slug: "suspension",
    nameAr: "عفشة (مساعدين ومقصات)",
    nameEn: "Suspension (Shocks & Control Arms)",
    titleAr: "عفشة تويوتا الأصلية | مساعدين ومقصات وروتينات OEM",
    titleEn: "Toyota Suspension Parts | Shocks, Arms & Bushings",
    descriptionAr:
      "قطع عفشة تويوتا الأصلية: مقصات، روتينات، صوامع، عمود فحدي، وكرة محور. يناسب لاند كروزر، فورتشنر، هايلوكس، كورولا، كامري وهايس. توافق دقيق وضمان وكالة.",
    descriptionEn:
      "Toyota genuine suspension parts: control arms, bushings, ball joints, stabiliser links and tie rods. Fits Land Cruiser, Fortuner, Hilux, Corolla, Camry and Hiace with dealer warranty.",
    keywordsAr:
      "عفشة تويوتا, مقصات تويوتا, روتينات تويوتا, كرة محور تويوتا, عفشة لاند كروزر, عفشة هايلوكس, عفشة فورتشنر, AISIN عفشة, suspension Toyota",
    keywordsEn:
      "Toyota suspension Egypt, Toyota control arm, Toyota ball joint, Toyota tie rod, Toyota bushing, Land Cruiser suspension, Hilux suspension, AISIN suspension",
    models: ["Land Cruiser", "Fortuner", "Hilux", "Corolla", "Camry", "Hiace", "Yaris", "RAV4", "Prado"],
  },

  shocks: {
    slug: "shocks",
    nameAr: "مساعدين",
    nameEn: "Shock Absorbers",
    titleAr: "مساعدين تويوتا الأصلية | KYB OEM لكل موديلات تويوتا",
    titleEn: "Toyota Shock Absorbers | KYB OEM for All Toyota Models",
    descriptionAr:
      "مساعدين تويوتا أمامي وخلفي بمواصفات الوكالة (KYB OEM). متوفر للاند كروزر، هايلوكس، فورتشنر، كورولا، كامري، هايس وكوستر — توصيل خلال 48 ساعة لكل المحافظات.",
    descriptionEn:
      "Toyota OEM front & rear shock absorbers (KYB). In stock for Land Cruiser, Hilux, Fortuner, Corolla, Camry, Hiace and Coaster — 48h nationwide delivery.",
    keywordsAr:
      "مساعدين تويوتا, مساعد امامي تويوتا, مساعد خلفي تويوتا, KYB تويوتا, مساعدين هايلوكس, مساعدين لاند كروزر, مساعدين كورولا",
    keywordsEn:
      "Toyota shock absorber Egypt, KYB Toyota, Toyota front shock, Toyota rear shock, Hilux shocks, Land Cruiser shocks, Corolla shocks",
    models: ["Land Cruiser", "Hilux", "Fortuner", "Corolla", "Camry", "Hiace", "Coaster", "Yaris", "RAV4"],
  },

  brakes: {
    slug: "brakes",
    nameAr: "فرامل",
    nameEn: "Brakes",
    titleAr: "فرامل تويوتا الأصلية | أقمشة وديسكات وهوبات OEM",
    titleEn: "Toyota Genuine Brakes | OEM Pads, Discs & Drums",
    descriptionAr:
      "قطع فرامل تويوتا الأصلية وتيل فرامل FBK المعتمد: أقمشة 04465-YZZxx، ديسكات، هوبات، خراطيم وحساسات ABS. يناسب كل موديلات تويوتا — أمان معتمد من الوكالة.",
    descriptionEn:
      "Toyota genuine brake parts & approved FBK brake pads: pads 04465-YZZxx, discs, drums, hoses and ABS sensors. Fits all Toyota models with dealer-grade safety.",
    keywordsAr:
      "فرامل تويوتا, تيل فرامل تويوتا, تيل فرامل FBK, ديسك فرامل تويوتا, هوبة فرامل, 04465-YZZ, فرامل كورولا, فرامل هايلوكس, brake pads Toyota Egypt",
    keywordsEn:
      "Toyota brake pads Egypt, FBK brake pads, Toyota brake disc, 04465 Toyota, Hilux brake pads, Corolla brake pads, Land Cruiser brakes",
    models: ["Corolla", "Camry", "Hilux", "Land Cruiser", "Fortuner", "RAV4", "Yaris", "Hiace"],
  },

  electrical: {
    slug: "electrical",
    nameAr: "كهرباء (دينامو ومارش)",
    nameEn: "Electrical (Alternator & Starter)",
    titleAr: "كهرباء تويوتا الأصلية | دينامو ومارش وحساسات OEM",
    titleEn: "Toyota Electrical Parts | Alternator, Starter & Sensors",
    descriptionAr:
      "قطع كهرباء تويوتا الأصلية و DENSO المعتمدة: دينامو 27060-xxxxx، مارش، حساسات أوكسجين وكرنك، ريليهات، ومفاتيح. يناسب كل موديلات تويوتا.",
    descriptionEn:
      "Toyota genuine & DENSO-approved electrical parts: alternator 27060-xxxxx, starter motor, oxygen and crankshaft sensors, relays and switches. Fits all Toyota models.",
    keywordsAr:
      "كهرباء تويوتا, دينامو تويوتا, مارش تويوتا, حساس اوكسجين تويوتا, حساس كرنك, DENSO تويوتا, 27060 تويوتا, كهرباء هايلوكس, كهرباء كورولا",
    keywordsEn:
      "Toyota alternator Egypt, Toyota starter motor, DENSO Toyota, Toyota oxygen sensor, Toyota crank sensor, 27060 Toyota, Hilux alternator, Corolla starter",
    models: ["Corolla", "Camry", "Hilux", "Land Cruiser", "Hiace", "Fortuner", "Yaris", "RAV4"],
  },

  "spark-plugs-coils": {
    slug: "spark-plugs-coils",
    nameAr: "بوجيهات وكويلات إشعال",
    nameEn: "Spark Plugs & Ignition Coils",
    titleAr: "بوجيهات وكويلات تويوتا | DENSO Iridium وOEM إشعال",
    titleEn: "Toyota Spark Plugs & Ignition Coils | DENSO Iridium & OEM",
    descriptionAr:
      "بوجيهات DENSO Iridium الأصلية وكويلات إشعال تويوتا OEM (90919-xxxxx). يناسب كورولا، كامري، ياريس، هايلوكس، فورتشنر ولاند كروزر — أداء وعمر أطول.",
    descriptionEn:
      "Genuine DENSO Iridium spark plugs and Toyota OEM ignition coils (90919-xxxxx). Fits Corolla, Camry, Yaris, Hilux, Fortuner and Land Cruiser for longer life.",
    keywordsAr:
      "بوجيهات تويوتا, DENSO Iridium, كويل اشعال تويوتا, 90919 تويوتا, بوجي كورولا, بوجي كامري, كويل هايلوكس, ignition coil Toyota",
    keywordsEn:
      "Toyota spark plugs, DENSO Iridium, Toyota ignition coil, 90919 Toyota, Corolla spark plug, Hilux ignition coil, Camry spark plug",
    models: ["Corolla", "Camry", "Yaris", "Hilux", "Fortuner", "Land Cruiser", "RAV4"],
  },

  "water-cooling": {
    slug: "water-cooling",
    nameAr: "دورة تبريد المياه",
    nameEn: "Water Cooling System",
    titleAr: "تبريد تويوتا الأصلي | رادياتير وثيرموستات وطلمبة مياه",
    titleEn: "Toyota Cooling System | Radiator, Thermostat & Water Pump",
    descriptionAr:
      "قطع نظام تبريد تويوتا الأصلية و AISIN: رادياتير 16400-xxxxx، طلمبة مياه AISIN، ثيرموستات، خراطيم تبريد، ومراوح تبريد. يناسب كل موديلات تويوتا في مصر.",
    descriptionEn:
      "Toyota genuine & AISIN cooling parts: radiator 16400-xxxxx, AISIN water pump, thermostat, hoses and cooling fans. Fits all Toyota models in Egypt.",
    keywordsAr:
      "تبريد تويوتا, رادياتير تويوتا, طلمبة مياه AISIN, ثيرموستات تويوتا, خرطوم تبريد, 16400 تويوتا, تبريد هايلوكس, تبريد لاند كروزر",
    keywordsEn:
      "Toyota cooling system, Toyota radiator Egypt, AISIN water pump, Toyota thermostat, 16400 Toyota, Hilux radiator, Land Cruiser cooling",
    models: ["Corolla", "Camry", "Hilux", "Land Cruiser", "Hiace", "Coaster", "Fortuner", "Prado"],
  },

  "belts-bearings": {
    slug: "belts-bearings",
    nameAr: "سيور وبلي مجموعة",
    nameEn: "Belts & Bearings",
    titleAr: "سير توقيت وبلي تويوتا الأصلية | AISIN وOEM",
    titleEn: "Toyota Timing Belts & Bearings | AISIN & OEM Kits",
    descriptionAr:
      "سير توقيت تويوتا، سير دينامو وكمبروسر، طقم بلي مجموعة AISIN، رولمان عجلة، وبلي طبلون. توافق مضمون لكورولا، كامري، هايلوكس، لاند كروزر وهايس.",
    descriptionEn:
      "Toyota timing belts, alternator/AC belts, AISIN bearing kits, wheel bearings and idler pulleys. Guaranteed fit for Corolla, Camry, Hilux, Land Cruiser and Hiace.",
    keywordsAr:
      "سير توقيت تويوتا, سير دينامو, AISIN بلي, رولمان تويوتا, طقم سير, سير كورولا, سير هايلوكس, timing belt Toyota",
    keywordsEn:
      "Toyota timing belt, AISIN bearing kit, Toyota wheel bearing, Toyota belt kit, Corolla timing belt, Hilux belt, Land Cruiser bearing",
    models: ["Corolla", "Camry", "Hilux", "Land Cruiser", "Hiace", "Coaster", "Fortuner"],
  },

  clutch: {
    slug: "clutch",
    nameAr: "ديسك واسطوانة دبرياج",
    nameEn: "Clutch Disc & Cylinder",
    titleAr: "دبرياج تويوتا الأصلي | AISIN ديسك وفحمة وأسطوانة",
    titleEn: "Toyota Clutch Kit | AISIN Disc, Cover & Cylinder",
    descriptionAr:
      "أطقم دبرياج AISIN الأصلية لتويوتا: ديسك، فحمة (ضاغط)، حامل بلية، وأسطوانة دبرياج علوية وسفلية. يناسب هايلوكس، لاند كروزر، هايس وكورولا مانيوال.",
    descriptionEn:
      "AISIN genuine Toyota clutch kits: disc, cover plate, release bearing, plus master & slave cylinders. Fits Hilux, Land Cruiser, Hiace and manual Corolla models.",
    keywordsAr:
      "دبرياج تويوتا, AISIN دبرياج, ديسك دبرياج, فحمة دبرياج, اسطوانة دبرياج, دبرياج هايلوكس, دبرياج لاند كروزر, clutch Toyota Egypt",
    keywordsEn:
      "AISIN clutch Toyota, Toyota clutch kit, Toyota clutch disc, Toyota clutch cylinder, Hilux clutch, Land Cruiser clutch, Hiace clutch",
    models: ["Hilux", "Land Cruiser", "Hiace", "Coaster", "Corolla", "Yaris"],
  },

  "oils-gasoline": {
    slug: "oils-gasoline",
    nameAr: "زيوت محركات بنزين",
    nameEn: "Gasoline Engine Oils",
    titleAr: "زيت محرك تويوتا بنزين الأصلي | 5W-30 و0W-20 و10W-40",
    titleEn: "Toyota Gasoline Engine Oil | 5W-30, 0W-20 & 10W-40",
    descriptionAr:
      "زيوت تويوتا الأصلية لمحركات البنزين بكل درجات اللزوجة: 0W-20 للهايبرد، 5W-30 لكورولا وكامري، 10W-40 للموديلات الأقدم. عبوات 1ل، 4ل و5ل.",
    descriptionEn:
      "Toyota genuine gasoline engine oils in all grades: 0W-20 for hybrid, 5W-30 for Corolla & Camry, 10W-40 for older models. Available in 1L, 4L and 5L bottles.",
    keywordsAr:
      "زيت تويوتا 5W-30, زيت تويوتا 0W-20, زيت تويوتا 10W-40, زيت كورولا اصلي, زيت كامري, زيت هايبرد تويوتا, Toyota oil Egypt",
    keywordsEn:
      "Toyota 5W-30, Toyota 0W-20, Toyota 10W-40, Toyota Corolla oil, Toyota Camry oil, Toyota hybrid oil, Toyota genuine motor oil Egypt",
    models: ["Corolla", "Camry", "Yaris", "RAV4", "Fortuner", "Land Cruiser"],
  },

  "oils-diesel": {
    slug: "oils-diesel",
    nameAr: "زيوت محركات ديزل",
    nameEn: "Diesel Engine Oils",
    titleAr: "زيت محرك تويوتا ديزل | 15W-40 و10W-30 لهايلوكس وهايس",
    titleEn: "Toyota Diesel Engine Oil | 15W-40 & 10W-30 for Hilux & Hiace",
    descriptionAr:
      "زيوت تويوتا الأصلية لمحركات الديزل: 15W-40 وCH-4 للهايلوكس والكوستر والهايس الديزل، و10W-30 للاند كروزر برادو الديزل. عبوات 4ل، 5ل و18ل.",
    descriptionEn:
      "Toyota genuine diesel engine oils: 15W-40 CH-4 for Hilux, Coaster and Hiace diesel; 10W-30 for Land Cruiser Prado diesel. Bottles 4L, 5L and 18L drums.",
    keywordsAr:
      "زيت تويوتا ديزل, زيت 15W-40 تويوتا, زيت 10W-30 تويوتا, زيت هايلوكس ديزل, زيت كوستر, زيت هايس ديزل, Toyota diesel oil Egypt",
    keywordsEn:
      "Toyota diesel oil, Toyota 15W-40, Toyota 10W-30, Hilux diesel oil, Hiace diesel oil, Coaster oil, Land Cruiser Prado diesel oil",
    models: ["Hilux", "Hiace", "Coaster", "Land Cruiser Prado", "Fortuner Diesel"],
  },

  "oils-transmission": {
    slug: "oils-transmission",
    nameAr: "زيوت الفتيس والنقل",
    nameEn: "Transmission & Transfer Oils",
    titleAr: "زيت فتيس تويوتا الأصلي | ATF WS وT-IV ونقل وديفرنس",
    titleEn: "Toyota Transmission Oil | ATF WS, T-IV, Transfer & Diff",
    descriptionAr:
      "زيوت ناقل الحركة الأصلية من تويوتا: ATF WS للفتيس الأوتوماتيك الحديث، ATF T-IV للموديلات الأقدم، زيت نقل الحركة (Transfer Case) وزيت الديفرنس 75W-90 و80W-90.",
    descriptionEn:
      "Toyota genuine transmission fluids: ATF WS for modern automatics, ATF T-IV for older models, transfer case oil and 75W-90 / 80W-90 differential gear oil.",
    keywordsAr:
      "زيت فتيس تويوتا, ATF WS تويوتا, ATF T-IV, زيت ديفرنس 75W-90, زيت نقل حركة تويوتا, زيت فتيس كورولا, Toyota ATF Egypt",
    keywordsEn:
      "Toyota ATF WS, Toyota ATF T-IV, Toyota transmission oil, Toyota differential oil 75W-90, Toyota transfer case oil, Corolla ATF, Land Cruiser ATF",
    models: ["Corolla", "Camry", "Hilux", "Land Cruiser", "Hiace", "Fortuner"],
  },

  "fiber-parts": {
    slug: "fiber-parts",
    nameAr: "أجزاء فيبر",
    nameEn: "Fiber Parts",
    titleAr: "أجزاء فيبر تويوتا الأصلية | بنوهات داخلية وخارجية",
    titleEn: "Toyota Fiber Body Parts | Interior & Exterior Trim",
    descriptionAr:
      "أجزاء فيبر تويوتا الأصلية: بنوهات داخلية، بطانات أبواب، تابلوهات، وغطاء محرك. توافق دقيق مع موديلات كورولا، كامري، هايلوكس، فورتشنر، ولاند كروزر.",
    descriptionEn:
      "Toyota genuine fiber body parts: interior trims, door panels, dashboards and engine covers. Precise fit for Corolla, Camry, Hilux, Fortuner and Land Cruiser.",
    keywordsAr:
      "فيبر تويوتا, بنوهات تويوتا, بطانة باب تويوتا, تابلوه تويوتا, فيبر لاند كروزر, فيبر هايلوكس, Toyota body trim",
    keywordsEn:
      "Toyota fiber parts, Toyota body trim, Toyota interior trim, Toyota door panel, Hilux trim, Land Cruiser trim, Corolla dashboard",
    models: ["Corolla", "Camry", "Hilux", "Land Cruiser", "Fortuner", "RAV4"],
  },

  bumpers: {
    slug: "bumpers",
    nameAr: "اكصدامات",
    nameEn: "Bumpers",
    titleAr: "اكصدامات تويوتا الأصلية | أمامي وخلفي OEM لكل الموديلات",
    titleEn: "Toyota Bumpers | OEM Front & Rear for All Toyota Models",
    descriptionAr:
      "اكصدامات تويوتا الأصلية أمامية وخلفية بطلاء أساس جاهز للرش. متاح لكورولا، كامري، هايلوكس، لاند كروزر، فورتشنر، ياريس، RAV4 وهايس — تركيب دقيق.",
    descriptionEn:
      "Toyota genuine front & rear bumpers, primed and ready for paint. Available for Corolla, Camry, Hilux, Land Cruiser, Fortuner, Yaris, RAV4 and Hiace.",
    keywordsAr:
      "اكصدام تويوتا, اكصدام كورولا, اكصدام كامري, اكصدام هايلوكس, اكصدام لاند كروزر, اكصدام امامي تويوتا, Toyota bumper Egypt",
    keywordsEn:
      "Toyota bumper, Toyota front bumper, Toyota rear bumper, Corolla bumper, Hilux bumper, Land Cruiser bumper, Camry bumper Egypt",
    models: ["Corolla", "Camry", "Hilux", "Land Cruiser", "Fortuner", "Yaris", "RAV4", "Hiace"],
  },

  lights: {
    slug: "lights",
    nameAr: "كشافات ولمبات",
    nameEn: "Lights & Lamps",
    titleAr: "كشافات تويوتا الأصلية | كشاف أمامي وخلفي ولمبات OEM",
    titleEn: "Toyota Lights & Headlamps | OEM Front, Rear & Bulbs",
    descriptionAr:
      "كشافات تويوتا الأصلية وأنوار LED: كشاف أمامي، استوب خلفي، شمعات إشارة، وكشافات ضباب. متوفر لكورولا، كامري، هايلوكس، لاند كروزر وفورتشنر.",
    descriptionEn:
      "Toyota genuine headlamps and LED lights: front headlamp, rear stop light, indicators and fog lights. Stocked for Corolla, Camry, Hilux, Land Cruiser and Fortuner.",
    keywordsAr:
      "كشافات تويوتا, كشاف امامي تويوتا, استوب تويوتا, لمبات تويوتا, كشاف لاند كروزر, كشاف هايلوكس, Toyota headlight Egypt",
    keywordsEn:
      "Toyota headlight, Toyota tail light, Toyota fog lamp, Corolla headlight, Hilux headlight, Land Cruiser headlamp, Camry tail light",
    models: ["Corolla", "Camry", "Hilux", "Land Cruiser", "Fortuner", "RAV4", "Yaris"],
  },

  mirrors: {
    slug: "mirrors",
    nameAr: "مرايات",
    nameEn: "Mirrors",
    titleAr: "مرايات تويوتا الأصلية | مراية جانبية وداخلية OEM",
    titleEn: "Toyota Mirrors | OEM Side & Interior Mirrors",
    descriptionAr:
      "مرايات تويوتا الأصلية الجانبية (يمين/شمال) والداخلية، يدوي وكهرباء وقابل للطي. يناسب كورولا، كامري، هايلوكس، لاند كروزر، فورتشنر وياريس.",
    descriptionEn:
      "Toyota genuine side (left/right) and interior mirrors — manual, powered and folding. Fits Corolla, Camry, Hilux, Land Cruiser, Fortuner and Yaris.",
    keywordsAr:
      "مراية تويوتا, مراية كورولا, مراية كامري, مراية هايلوكس, مراية لاند كروزر, Toyota side mirror Egypt",
    keywordsEn:
      "Toyota mirror Egypt, Toyota side mirror, Corolla mirror, Hilux mirror, Land Cruiser mirror, Camry side mirror",
    models: ["Corolla", "Camry", "Hilux", "Land Cruiser", "Fortuner", "Yaris", "RAV4"],
  },

  rubber: {
    slug: "rubber",
    nameAr: "كاوتشات",
    nameEn: "Rubber Parts",
    titleAr: "كاوتشات تويوتا الأصلية | كاوتش باب وشاسيه وعلب محرك",
    titleEn: "Toyota Rubber Parts | Door Seals, Bushings & Engine Mounts",
    descriptionAr:
      "كاوتشات تويوتا الأصلية: كاوتش باب وشمعات، كرسي محرك، علب فتيس، وكاوتش زجاج. مرونة عالية ومقاومة لحرارة مصر — يناسب كل موديلات تويوتا.",
    descriptionEn:
      "Toyota genuine rubber parts: door & glass seals, engine mounts, gearbox mounts and bushings. Heat-resistant for Egypt's climate, fits all Toyota models.",
    keywordsAr:
      "كاوتشات تويوتا, كاوتش باب تويوتا, كرسي محرك تويوتا, علبة فتيس, كاوتش زجاج, Toyota rubber parts",
    keywordsEn:
      "Toyota rubber parts, Toyota engine mount, Toyota door seal, Toyota gearbox mount, Toyota window seal Egypt",
    models: ["Corolla", "Camry", "Hilux", "Land Cruiser", "Fortuner", "Hiace", "Yaris"],
  },

  steering: {
    slug: "steering",
    nameAr: "عمة ومقود",
    nameEn: "Steering",
    titleAr: "عمود توجيه تويوتا الأصلي | عمة ومقود وطلمبة هيدروليك",
    titleEn: "Toyota Steering | Column, Rack & Power Steering Pump",
    descriptionAr:
      "قطع توجيه تويوتا الأصلية: عمود توجيه (عمة)، علبة مقود (Rack)، طلمبة هيدروليك، أعمدة قارد، ووصلات. يناسب كل موديلات تويوتا — تركيب دقيق وثبات في المقود.",
    descriptionEn:
      "Toyota genuine steering parts: steering column, rack, power steering pump, drag links and joints. Fits all Toyota models with precise on-centre feel.",
    keywordsAr:
      "عمود توجيه تويوتا, مقود تويوتا, علبة مقود تويوتا, طلمبة هيدروليك تويوتا, Toyota steering Egypt",
    keywordsEn:
      "Toyota steering rack, Toyota steering column, Toyota power steering pump, Toyota tie rod, Hilux steering, Corolla steering",
    models: ["Corolla", "Camry", "Hilux", "Land Cruiser", "Fortuner", "Hiace", "Yaris"],
  },

  gaskets: {
    slug: "gaskets",
    nameAr: "جوانات",
    nameEn: "Gaskets",
    titleAr: "جوانات تويوتا الأصلية | وش سلندر وكرتير وكولكتور",
    titleEn: "Toyota Gaskets | Head, Sump & Manifold Gaskets",
    descriptionAr:
      "جوانات تويوتا الأصلية: وش سلندر، جوان كرتير زيت، جوان كولكتور سحب وعادم، جوان طلمبة مياه. مواد أصلية تتحمل ضغط المحركات الحديثة.",
    descriptionEn:
      "Toyota genuine gaskets: cylinder head, oil pan, intake/exhaust manifold and water pump gaskets. Original materials engineered for modern engine pressures.",
    keywordsAr:
      "جوانات تويوتا, وش سلندر تويوتا, جوان كرتير, جوان كولكتور, جوان طلمبة مياه, Toyota head gasket",
    keywordsEn:
      "Toyota gasket, Toyota head gasket, Toyota oil pan gasket, Toyota manifold gasket, Hilux gasket, Land Cruiser head gasket",
    models: ["Corolla", "Camry", "Hilux", "Land Cruiser", "Hiace", "Coaster", "Fortuner"],
  },

  "oil-seals": {
    slug: "oil-seals",
    nameAr: "اويل سيل",
    nameEn: "Oil Seals",
    titleAr: "اويل سيل تويوتا الأصلي | جوانات عمود الكرنك والكامة",
    titleEn: "Toyota Oil Seals | Crankshaft & Camshaft Seals",
    descriptionAr:
      "اويل سيل تويوتا الأصلي لعمود الكرنك (أمامي وخلفي)، عمود الكامة، طلمبة المياه، ونقل الحركة. منع تسرب مضمون لكل موديلات تويوتا.",
    descriptionEn:
      "Toyota genuine oil seals for crankshaft (front & rear), camshaft, water pump and transmission. Reliable leak prevention for every Toyota model.",
    keywordsAr:
      "اويل سيل تويوتا, اويل سيل كرنك, اويل سيل كامة, جوانات تسريب تويوتا, Toyota oil seal Egypt",
    keywordsEn:
      "Toyota oil seal, Toyota crankshaft seal, Toyota camshaft seal, Toyota transmission seal, Hilux oil seal, Corolla oil seal",
    models: ["Corolla", "Camry", "Hilux", "Land Cruiser", "Hiace", "Fortuner"],
  },
};

// ─────────────────────────────────────────────────────────────────────
// Legacy slug aliases.
//
// Older internal links and indexed URLs used flat slugs like `oils`,
// `engine`, `cooling`, `motor`. Map them to the closest real category
// so SEO + canonical resolution still work without breaking links.
// ─────────────────────────────────────────────────────────────────────
const SLUG_ALIASES: Record<string, string> = {
  oils: "oils-gasoline",
  oil: "oils-gasoline",
  motor: "oils-gasoline",
  engine: "gaskets", // closest real "engine internals" category we have
  cooling: "water-cooling",
  bearings: "belts-bearings",
  belts: "belts-bearings",
  "spark-plugs": "spark-plugs-coils",
  "ignition-coils": "spark-plugs-coils",
};

/**
 * Resolve any slug (including legacy aliases) to the canonical category
 * meta. Returns null when no match exists — caller should fall back to
 * the generic /products meta in that case.
 */
export const getCategorySEO = (slug?: string | null): CategorySEOMeta | null => {
  if (!slug) return null;
  const normalised = slug.toLowerCase().trim();
  const resolved = SLUG_ALIASES[normalised] ?? normalised;
  return CATEGORY_SEO[resolved] ?? null;
};

/** All categories sorted alphabetically by Arabic name — useful for sitemaps. */
export const ALL_CATEGORIES = Object.values(CATEGORY_SEO).sort((a, b) =>
  a.nameAr.localeCompare(b.nameAr, "ar")
);
