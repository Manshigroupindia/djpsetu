import { uploadToCloudinary } from './cloudinaryService';

/**
 * Uploads a brand asset (Company Logo or Payment Scanner) to Cloudinary.
 * Preserves the existing signature for compatibility across the Invoice application.
 */
export async function uploadBrandAsset(
  file: File,
  folder: 'logos' | 'scanners',
  onProgress?: (progressPercent: number) => void
): Promise<string> {
  const targetFolder = `djpinvoice/${folder}`;
  const result = await uploadToCloudinary(file, {
    folder: targetFolder,
    onProgress,
  });
  return result.secureUrl;
}

/**
 * Validates whether an image URL can be loaded successfully by the browser
 */
export function validateImageUrl(url: string): Promise<boolean> {
  if (!url || !url.trim()) return Promise.resolve(false);
  const cleanUrl = url.trim();

  // Basic protocol check
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('/')) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = cleanUrl;
  });
}
