import { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  alt: string;
  className?: string;
}

/** Removes only the near-white area connected to the image edges, preserving white product labels. */
const TransparentProductImage = ({ src, alt, className }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    image.onload = () => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const scale = Math.min(1, 1000 / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.width = width;
      canvas.height = height;

      try {
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          setFallback(true);
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        const frame = context.getImageData(0, 0, width, height);
        const pixels = frame.data;
        const visited = new Uint8Array(width * height);
        const queue = new Int32Array(width * height);
        let head = 0;
        let tail = 0;

        const isBackground = (index: number) => {
          const offset = index * 4;
          const red = pixels[offset];
          const green = pixels[offset + 1];
          const blue = pixels[offset + 2];
          return red >= 224 && green >= 224 && blue >= 224 && Math.max(red, green, blue) - Math.min(red, green, blue) <= 18;
        };
        const enqueue = (index: number) => {
          if (visited[index] || !isBackground(index)) return;
          visited[index] = 1;
          queue[tail++] = index;
        };

        for (let x = 0; x < width; x += 1) {
          enqueue(x);
          enqueue((height - 1) * width + x);
        }
        for (let y = 1; y < height - 1; y += 1) {
          enqueue(y * width);
          enqueue(y * width + width - 1);
        }

        while (head < tail) {
          const index = queue[head++];
          const x = index % width;
          const y = Math.floor(index / width);
          pixels[index * 4 + 3] = 0;
          if (x > 0) enqueue(index - 1);
          if (x + 1 < width) enqueue(index + 1);
          if (y > 0) enqueue(index - width);
          if (y + 1 < height) enqueue(index + width);
        }

        context.putImageData(frame, 0, 0);

        // Trim the transparent studio margin so the product, not the source canvas,
        // determines its visual size inside every card.
        let minX = width;
        let minY = height;
        let maxX = -1;
        let maxY = -1;
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            if (pixels[(y * width + x) * 4 + 3] <= 8) continue;
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }

        if (maxX >= minX && maxY >= minY) {
          const contentWidth = maxX - minX + 1;
          const contentHeight = maxY - minY + 1;
          const padding = Math.max(4, Math.round(Math.max(contentWidth, contentHeight) * 0.035));
          const cropX = Math.max(0, minX - padding);
          const cropY = Math.max(0, minY - padding);
          const cropWidth = Math.min(width - cropX, contentWidth + padding * 2);
          const cropHeight = Math.min(height - cropY, contentHeight + padding * 2);
          const cropped = context.getImageData(cropX, cropY, cropWidth, cropHeight);
          canvas.width = cropWidth;
          canvas.height = cropHeight;
          const croppedContext = canvas.getContext("2d");
          croppedContext?.putImageData(cropped, 0, 0);
        }
      } catch {
        setFallback(true);
      }
    };
    image.onerror = () => setFallback(true);
    image.src = src;

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (fallback) return <img src={src} alt={alt} className={className} loading="lazy" />;
  return <canvas ref={canvasRef} role="img" aria-label={alt} className={className} />;
};

export default TransparentProductImage;