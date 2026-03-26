import { type ImgHTMLAttributes, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ProductImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
}

const processedImageCache = new Map<string, string>();

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const getPixelIndex = (x: number, y: number, width: number) =>
  (y * width + x) * 4;

const getBrightness = (red: number, green: number, blue: number) =>
  (red + green + blue) / 3;

const getSpread = (red: number, green: number, blue: number) =>
  Math.max(red, green, blue) - Math.min(red, green, blue);

const isLightNeutral = (red: number, green: number, blue: number) => {
  const brightness = getBrightness(red, green, blue);
  const spread = getSpread(red, green, blue);
  return brightness > 188 && spread < 52;
};

const colorDistance = (
  red: number,
  green: number,
  blue: number,
  target: { red: number; green: number; blue: number }
) => Math.hypot(red - target.red, green - target.green, blue - target.blue);

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
        const width = canvas.width;
        const height = canvas.height;

        const edgeSeeds: number[] = [];
        let edgeRed = 0;
        let edgeGreen = 0;
        let edgeBlue = 0;
        let edgeCount = 0;

        const collectEdgePixel = (x: number, y: number) => {
          const index = getPixelIndex(x, y, width);
          const alpha = data[index + 3];
          if (alpha === 0) return;

          const red = data[index];
          const green = data[index + 1];
          const blue = data[index + 2];

          if (!isLightNeutral(red, green, blue)) return;

          edgeSeeds.push(index);
          edgeRed += red;
          edgeGreen += green;
          edgeBlue += blue;
          edgeCount += 1;
        };

        for (let x = 0; x < width; x += 1) {
          collectEdgePixel(x, 0);
          collectEdgePixel(x, height - 1);
        }

        for (let y = 1; y < height - 1; y += 1) {
          collectEdgePixel(0, y);
          collectEdgePixel(width - 1, y);
        }

        if (edgeCount > 0) {
          const backgroundColor = {
            red: edgeRed / edgeCount,
            green: edgeGreen / edgeCount,
            blue: edgeBlue / edgeCount,
          };

          const visited = new Uint8Array(width * height);
          const queue = [...edgeSeeds];

          while (queue.length > 0) {
            const index = queue.shift()!;
            const pixelPosition = index / 4;
            if (visited[pixelPosition]) continue;

            const alpha = data[index + 3];
            if (alpha === 0) continue;

            const red = data[index];
            const green = data[index + 1];
            const blue = data[index + 2];
            const brightness = getBrightness(red, green, blue);
            const spread = getSpread(red, green, blue);
            const nearBackground = colorDistance(red, green, blue, backgroundColor) < 62;
            const neutralLight = brightness > 178 && spread < 58;

            if (!nearBackground && !neutralLight) continue;

            visited[pixelPosition] = 1;
            data[index] = 255;
            data[index + 1] = 255;
            data[index + 2] = 255;

            const x = pixelPosition % width;
            const y = Math.floor(pixelPosition / width);

            if (x > 0) queue.push(index - 4);
            if (x < width - 1) queue.push(index + 4);
            if (y > 0) queue.push(index - width * 4);
            if (y < height - 1) queue.push(index + width * 4);
          }
        }

        for (let index = 0; index < data.length; index += 4) {
          const alpha = data[index + 3];
          if (alpha === 0) continue;

          const red = data[index];
          const green = data[index + 1];
          const blue = data[index + 2];
          const brightness = getBrightness(red, green, blue);
          const spread = getSpread(red, green, blue);

          if (brightness < 214) continue;

          const lightStrength = clamp((brightness - 214) / 41);
          const neutralStrength = clamp((48 - spread) / 48);
          const blend = clamp(neutralStrength * 0.9 + lightStrength * 0.45);

          if (blend <= 0) continue;

          const snapToWhite = brightness > 232 && spread < 28;

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