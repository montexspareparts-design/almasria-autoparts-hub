import { type ImgHTMLAttributes, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ProductImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
}

const processedImageCache = new Map<string, string>();

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const normalizeImageBackground = (src: string) =>
  new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";
    image.decoding = "async";

    image.onload = () => {
      try {
        const maxDimension = 1600;
        const scale = Math.min(
          1,
          maxDimension / Math.max(image.naturalWidth, image.naturalHeight)
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

        const context = canvas.getContext("2d", {
          willReadFrequently: true,
        });

        if (!context) {
          reject(new Error("Canvas context unavailable"));
          return;
        }

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const { data } = imageData;

        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3];
          if (alpha === 0) continue;

          const red = data[index];
          const green = data[index + 1];
          const blue = data[index + 2];
          const brightness = (red + green + blue) / 3;
          const spread = Math.max(red, green, blue) - Math.min(red, green, blue);

          if (brightness < 208) continue;

          const lightStrength = clamp((brightness - 208) / 47);
          const neutralStrength = clamp((42 - spread) / 42);
          const blend = clamp(neutralStrength * 0.85 + lightStrength * 0.35);

          if (blend <= 0) continue;

          const snapToWhite = brightness > 238 && spread < 22;

          data[index] = snapToWhite ? 255 : Math.round(red + (255 - red) * blend);
          data[index + 1] = snapToWhite ? 255 : Math.round(green + (255 - green) * blend);
          data[index + 2] = snapToWhite ? 255 : Math.round(blue + (255 - blue) * blend);
        }

        context.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (error) {
        reject(error);
      }
    };

    image.onerror = () => reject(new Error("Image failed to load"));
    image.src = src;
  });

const ProductImage = ({ src, alt = "", className, ...props }: ProductImageProps) => {
  const [displaySrc, setDisplaySrc] = useState(src ?? "");
  const [isProcessed, setIsProcessed] = useState(false);

  useEffect(() => {
    if (!src) {
      setDisplaySrc("");
      setIsProcessed(false);
      return;
    }

    const cachedSrc = processedImageCache.get(src);
    if (cachedSrc) {
      setDisplaySrc(cachedSrc);
      setIsProcessed(true);
      return;
    }

    let isCancelled = false;
    setDisplaySrc(src);
    setIsProcessed(false);

    normalizeImageBackground(src)
      .then((nextSrc) => {
        if (isCancelled) return;
        processedImageCache.set(src, nextSrc);
        setDisplaySrc(nextSrc);
        setIsProcessed(true);
      })
      .catch(() => {
        if (isCancelled) return;
        setDisplaySrc(src);
        setIsProcessed(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [src]);

  if (!src) return null;

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={cn(
        "w-full h-full object-contain",
        !isProcessed && "mix-blend-multiply",
        className
      )}
      {...props}
    />
  );
};

export default ProductImage;