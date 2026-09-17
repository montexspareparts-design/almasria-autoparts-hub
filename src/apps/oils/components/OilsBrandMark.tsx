import logoAsset from "@/assets/oils/almasria-oils-logo.png.asset.json";

interface OilsBrandMarkProps {
  className?: string;
  showName?: boolean;
}

const OilsBrandMark = ({ className = "" }: OilsBrandMarkProps) => (
  <div className={`oils-brand-lockup ${className}`} aria-label="المصرية للزيوت">
    <img className="oils-brand-logo" src={logoAsset.url} alt="المصرية — موزع معتمد لزيوت تويوتا الأصلية" loading="eager" decoding="async" />
  </div>
);

export default OilsBrandMark;
