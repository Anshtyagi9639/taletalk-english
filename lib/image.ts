/**
 * Browser only: makes a photo smaller before we send it (phone photos are 3-10 MB).
 * Returns a JPEG data URL, at most `maxSide` pixels wide/high.
 */
export async function shrinkPhoto(file: File, maxSide = 1280, quality = 0.82): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("We cannot open this photo. Please use a JPG or PNG photo.");
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser cannot prepare this photo.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Keep it under ~1 MB so it fits in one request.
  let q = quality;
  let url = canvas.toDataURL("image/jpeg", q);
  while (url.length > 1_000_000 && q > 0.4) {
    q -= 0.15;
    url = canvas.toDataURL("image/jpeg", q);
  }
  return url;
}
