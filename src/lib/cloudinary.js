import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from './AppError.js';
import { logger } from './logger.js';

// Minimal Cloudinary client: signs direct uploads from the admin panel and deletes images.
// The API secret never leaves the server.

const API_BASE = 'https://api.cloudinary.com/v1_1';
export const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function isCloudinaryConfigured() {
  return Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
}

function assertConfigured() {
  if (!isCloudinaryConfigured()) {
    throw new AppError(
      503,
      'UPLOADS_NOT_CONFIGURED',
      'Image uploads are not configured yet. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to api/.env.',
    );
  }
}

/** Cloudinary signature: SHA-1 of the sorted "key=value" pairs followed by the API secret. */
function sign(params) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1')
    .update(payload + env.CLOUDINARY_API_SECRET)
    .digest('hex');
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

/** Parameters the admin panel needs to upload one file straight to Cloudinary. */
export function createUploadSignature(folder) {
  assertConfigured();
  const params = {
    allowed_formats: ALLOWED_FORMATS.join(','),
    folder: `${env.CLOUDINARY_ROOT_FOLDER}/${folder}`,
    timestamp: nowSeconds(),
  };
  return {
    uploadUrl: `${API_BASE}/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    folder: params.folder,
    allowedFormats: params.allowed_formats,
    timestamp: params.timestamp,
    signature: sign(params),
    maxFileSizeBytes: MAX_UPLOAD_BYTES,
  };
}

/** True for images we uploaded ourselves; seeded placeholders and foreign ids are never deleted. */
export function isOwnPublicId(publicId) {
  return typeof publicId === 'string' && publicId.startsWith(`${env.CLOUDINARY_ROOT_FOLDER}/`);
}

/** Deletes an image. Best effort: failures are logged, never thrown (the database change already happened). */
export async function destroyImage(publicId) {
  if (!isOwnPublicId(publicId) || !isCloudinaryConfigured()) return false;
  const params = { public_id: publicId, timestamp: nowSeconds() };
  const body = new URLSearchParams({ ...params, api_key: env.CLOUDINARY_API_KEY, signature: sign(params) });
  try {
    const res = await fetch(`${API_BASE}/${env.CLOUDINARY_CLOUD_NAME}/image/destroy`, {
      method: 'POST',
      body,
    });
    const result = await res.json();
    if (result.result !== 'ok' && result.result !== 'not found') {
      logger.warn({ publicId, result }, 'Cloudinary did not delete the image');
      return false;
    }
    return true;
  } catch (error) {
    logger.error({ err: error, publicId }, 'Cloudinary delete failed');
    return false;
  }
}

/** Deletes every image in the list that is no longer referenced. */
export async function destroyImages(publicIds) {
  await Promise.all([...new Set(publicIds.filter(Boolean))].map(destroyImage));
}
