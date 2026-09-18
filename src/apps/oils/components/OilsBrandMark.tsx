import logoAsset from "@/assets/oils/almasria-oils-wholesale-logo.jpg.asset.json";

interface OilsBrandMarkProps {
  className?: string;
  showName?: boolean;
}

const OilsBrandMark = ({ className = "" }: OilsBrandMarkProps) => (
  <div className={`oils-brand-lockup ${className}`} aria-label="المصرية زيوت جملة">
    <img className="oils-brand-logo" src={logoAsset.url} alt="المصرية زيوت جملة — موزع معتمد لزيوت تويوتا الأصلية" loading="eager" decoding="async" />
  </div>
);

export default OilsBrandMark;
