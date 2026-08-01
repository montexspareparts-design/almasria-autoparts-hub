import heroImage from "@/assets/native/hero-parts-real.jpg";

const NativeHero3D = () => (
  <div className="relative w-full overflow-hidden">
    <img
      src={heroImage}
      alt="قطع غيار تويوتا الأصلية — فلتر زيت وزيت محرك وبوجيه دينسو"
      width={1280}
      height={960}
      className="h-[320px] w-full object-cover"
    />
    {/* cinematic depth — keeps the photo readable behind the hero copy */}
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-carbon via-carbon/70 to-carbon/25" />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-carbon/80 via-transparent to-transparent" />
  </div>
);

export default NativeHero3D;
