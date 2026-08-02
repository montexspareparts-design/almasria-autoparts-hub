import heroImage from "@/assets/native/hero-parts-real.jpg";

/**
 * Native hero backdrop.
 * The photo occupies the top half; the lower half fades to solid carbon so the
 * headline block below always sits on a clean, high-contrast surface.
 */
const NativeHero3D = () => (
  <div className="relative w-full overflow-hidden">
    <img
      src={heroImage}
      alt="قطع غيار تويوتا الأصلية — فلتر زيت وزيت محرك وبوجيه دينسو"
      width={1280}
      height={960}
      className="h-[440px] w-full object-cover object-top"
    />
    {/* cinematic depth — the bottom 45% is solid so hero copy never fights the photo */}
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-carbon/45 via-carbon/25 to-carbon" />
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] bg-gradient-to-t from-carbon via-carbon/95 to-transparent" />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-carbon/70 via-transparent to-transparent" />
  </div>
);

export default NativeHero3D;
