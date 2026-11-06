import type { EmbeddedImage } from './data/jsonBlob.ts';

/** File types the image upload accepts unless a caller narrows them. */
export const DEFAULT_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

/**
 * The draft is mirrored to localStorage (about 5MB), and base64 adds a third on top, so large
 * files are refused rather than stored.
 */
export const DEFAULT_MAX_IMAGE_BYTES = 512 * 1024;

/** Used when an SVG has no size of its own, so it still has pixels to draw. */
const FALLBACK_SIZE = 256;

/** Returns a reader-friendly reason the file can't be used, or undefined if it's fine. */
export function validateImageFile(
  file: { type: string; size: number },
  { maxBytes = DEFAULT_MAX_IMAGE_BYTES, accept = DEFAULT_IMAGE_TYPES } = {}
): string | undefined {
  if (!accept.includes(file.type)) return `Unsupported file type. Use ${accept.map(type => type.replace('image/', '')).join(', ')}.`;
  if (file.size > maxBytes) return `File is too large (${Math.round(file.size / 1024)} KB). The limit is ${Math.round(maxBytes / 1024)} KB.`;
  return undefined;
}

const readAsDataUri = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });

/**
 * Reads an uploaded file into the shape stored in the blob. Rejects with a message fit to show
 * the user if the type or size isn't allowed or the browser can't decode the image.
 */
export async function readEmbeddedImage(
  file: File,
  options: { maxBytes?: number; accept?: string[] } = {}
): Promise<EmbeddedImage> {
  const problem = validateImageFile(file, options);
  if (problem) throw new Error(problem);

  const dataUri = await readAsDataUri(file);
  const image = new Image();
  image.src = dataUri;
  await image.decode().catch(() => {
    throw new Error('The browser could not read this image.');
  });

  return {
    dataUri,
    name: file.name,
    width: image.naturalWidth || FALLBACK_SIZE,
    height: image.naturalHeight || FALLBACK_SIZE
  };
}
