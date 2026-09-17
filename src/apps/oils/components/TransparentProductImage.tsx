interface Props {
  src: string;
  alt: string;
  className?: string;
}

/** Product sources are pre-cut once, so the browser never damages pale handles or labels. */
const TransparentProductImage = ({ src, alt, className }: Props) => {
  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />;
};

export default TransparentProductImage;