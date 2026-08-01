import heroImage from "@/assets/native-hero-premium.jpg";

const NativeHero3D = () => (
  <div className="relative w-full overflow-hidden rounded-[28px] border border-white/10 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.8)]">
    <img
      src={heroImage}
      alt="قطع غيار تويوتا الأصلية - فلتر زيت وبوجيه دينسو"
      width={1280}
      height={960}
      className="h-[240px] w-full object-cover"
    />
    {/* depth + brand wash */}
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_15%_20%,hsl(var(--gold)/0.14),transparent_60%)]" />

    <div className="absolute bottom-4 right-4 left-4 flex items-end justify-between">
      <div className="text-right">
        <p className="text-[11px] tracking-[0.3em] text-[hsl(var(--gold))]">GENUINE PARTS</p>
        <h3 className="mt-1 text-lg font-bold text-foreground">قطع غيار أصلية 100%</h3>
      </div>
      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold text-foreground backdrop-blur-md">
        DENSO ◆ TOYOTA
      </span>
    </div>
  </div>
);

export default NativeHero3D;
