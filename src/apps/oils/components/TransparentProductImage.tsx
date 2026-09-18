/** الأصل العام الذي تُخدَم منه أصول CDN المسجلة كمسارات نسبية (/__l5e/...). */
const CDN_ORIGIN = "https://almasria-autoparts-hub.lovable.app";

/**
 * يحوّل المسار النسبي للأصل إلى رابط مطلق.
 * على الويب يعمل المسار النسبي، لكن داخل WebView أندرويد (origin محلي)
 * يجب الرابط المطلق وإلا تظهر الصورة مكسورة.
 */
export const resolveAssetUrl = (src: string): string => {
  if (!src) return src;
  if (src.startsWith("/")) return `${CDN_ORIGIN}${src}`;
  return src;
};

interface Props {
  src: string;
  alt: string;
  className?: string;
}

/** Product sources are pre-cut once, so the browser never damages pale handles or labels. */
const TransparentProductImage = ({ src, alt, className }: Props) => {
  return <img src={resolveAssetUrl(src)} alt={alt} className={className} loading="lazy" decoding="async" />;
};

export default TransparentProductImage;
