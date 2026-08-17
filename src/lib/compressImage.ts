/**
 * Compress / downscale an image file in the browser and return a JPEG data URL.
 * Prevents "image too large" failures on phone cameras (photos are 8–15 MB).
 */
export async function compressImageToDataUrl(
  file: File,
  opts: { maxDimension?: number; maxBytes?: number } = {}
): Promise<string> {
  const maxDimension = opts.maxDimension ?? 1600;
  const maxBytes = opts.maxBytes ?? 3.5 * 1024 * 1024;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image_decode_failed"));
      el.src = objectUrl;
    });

    let { width, height } = img;
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas_unavailable");
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.82;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    // approx bytes of a base64 payload
    const bytesOf = (u: string) => Math.ceil((u.length - u.indexOf(",") - 1) * 0.75);

    while (bytesOf(dataUrl) > maxBytes && quality > 0.4) {
      quality -= 0.12;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
    }

    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
