/**
 * Cloudinary Upload Service for Deven Jha Productions Invoice Portal
 * Cloud Name: o89vqxup
 * Upload Preset: rha registration 2026 (exact string with spaces)
 * API Key: 826518622761133
 * Endpoint: https://api.cloudinary.com/v1_1/o89vqxup/image/upload
 */

export const INVOICE_CLOUDINARY_CONFIG = {
  cloudName: 'o89vqxup',
  apiKey: '826518622761133',
  uploadPreset: 'rha registration 2026',
  uploadEndpoint: 'https://api.cloudinary.com/v1_1/o89vqxup/image/upload',
} as const;

export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];

export const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Megabytes

export interface CloudinaryUploadResult {
  secureUrl: string;
  url: string;
  publicId: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
  createdAt?: string;
}

export interface UploadAssetOptions {
  folder?: string;
  onProgress?: (progressPercent: number) => void;
}

/**
 * Validates file format and size for image uploads
 */
export function validateImageFile(file: File): void {
  const fileType = file.type?.toLowerCase() || '';
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  const isMimeValid = ALLOWED_IMAGE_TYPES.includes(fileType);
  const isExtValid = ALLOWED_EXTENSIONS.includes(extension);

  if (!isMimeValid && !isExtValid) {
    throw new Error(
      `Unsupported image format "${file.name}". Please upload a PNG, JPG, JPEG, or WebP image.`
    );
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    throw new Error(
      `Image size (${sizeMb} MB) exceeds maximum allowed limit of 10 MB. Please upload a smaller image.`
    );
  }
}

/**
 * Uploads an image file to Cloudinary using unsigned upload preset
 */
export async function uploadToCloudinary(
  file: File,
  options?: UploadAssetOptions
): Promise<CloudinaryUploadResult> {
  // 1. Validate file format and size
  validateImageFile(file);

  const { onProgress, folder } = options || {};

  // 2. Prepare FormData payload for unsigned upload
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', INVOICE_CLOUDINARY_CONFIG.uploadPreset);
  formData.append('api_key', INVOICE_CLOUDINARY_CONFIG.apiKey);
  if (folder) {
    formData.append('folder', folder);
  }

  // 3. Upload using XMLHttpRequest to support live progress tracking
  return new Promise<CloudinaryUploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', INVOICE_CLOUDINARY_CONFIG.uploadEndpoint);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          if (!response.secure_url) {
            reject(new Error('Cloudinary response did not contain a secure_url.'));
            return;
          }
          resolve({
            secureUrl: response.secure_url,
            url: response.url || response.secure_url,
            publicId: response.public_id,
            format: response.format,
            bytes: response.bytes,
            width: response.width,
            height: response.height,
            createdAt: response.created_at,
          });
        } else {
          const errMsg =
            response.error?.message ||
            `Cloudinary upload failed with HTTP status ${xhr.status}`;
          reject(new Error(errMsg));
        }
      } catch {
        reject(
          new Error(
            `Failed to parse Cloudinary response: ${xhr.responseText.slice(0, 150)}`
          )
        );
      }
    };

    xhr.onerror = () => {
      reject(
        new Error(
          'Network connection error while uploading to Cloudinary. Please check your internet connection.'
        )
      );
    };

    xhr.ontimeout = () => {
      reject(new Error('Cloudinary upload timed out (60s limit). Please try again.'));
    };

    xhr.timeout = 60000; // 60s
    xhr.send(formData);
  });
}
