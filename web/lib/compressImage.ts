// Client-side image preparation for Supabase Storage uploads.
// Phone camera shots are 5–12 MB; resize to max 1600px long edge + JPEG q0.85
// in-browser so uploads survive mobile connections.

export type PreparedImage = {
  payload: File | Blob;
  ext: string;
  contentType: string;
};

const HEIC_TYPES = ['image/heic', 'image/heif'];

export async function prepareImageUpload(
  file: File,
  maxSide = 1600,
  quality = 0.85,
): Promise<PreparedImage> {
  const original: PreparedImage = {
    payload: file,
    ext: (file.name.split('.').pop() ?? 'jpg').toLowerCase(),
    contentType: file.type || 'application/octet-stream',
  };
  if (!file.type.startsWith('image/')) {
    throw new Error(`«${file.name}» — не изображение. Выбери фото (JPG/PNG).`);
  }
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    // Undecodable in this browser. HEIC (iPhone raw format) would upload fine
    // but never render for visitors — reject with a clear message instead.
    if (HEIC_TYPES.includes(file.type) || /\.hei[cf]$/i.test(file.name)) {
      throw new Error(
        `«${file.name}» в формате HEIC — браузеры покупателей его не покажут. ` +
        'В настройках камеры iPhone включи «Наиболее совместимые» (JPEG) или пришли фото через WhatsApp/скриншот.',
      );
    }
    return original;
  }
  let { width, height } = bitmap;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  width = Math.round(width * scale);
  height = Math.round(height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) { bitmap.close?.(); return original; }
  ctx.fillStyle = '#fff'; // flatten transparency (PNG → white bg)
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  if (!blob || blob.size >= file.size) return original; // already smaller → keep original
  return { payload: blob, ext: 'jpg', contentType: 'image/jpeg' };
}
