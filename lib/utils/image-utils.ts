/**
 * @file lib/utils/image-utils.ts
 * @description Image handling utilities for persona photos
 * 
 * Provides functions for:
 * - Converting files to base64
 * - Validating image files
 * - Resizing images to save localStorage space
 */

'use client';

import { logger } from './logger';

/**
 * Maximum file size in bytes (2MB)
 */
const MAX_FILE_SIZE = 2 * 1024 * 1024;

/**
 * Allowed image MIME types
 */
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate image file type and size
 */
export function validateImageFile(file: File): ValidationResult {
  // Check file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload a JPG, PNG, or WebP image.',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File is too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
    };
  }

  return { valid: true };
}

/**
 * Convert File to base64 string
 * Returns a promise that resolves with the base64 data URL
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as string'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Resize image to fit within max dimensions
 * Returns a promise that resolves with resized base64 data URL
 */
export function resizeImage(base64: string, maxWidth: number = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to base64
      try {
        const resizedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        resolve(resizedBase64);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = base64;
  });
}

/**
 * Process uploaded image file
 * - Validates file
 * - Converts to base64
 * - Resizes if needed
 * Returns base64 data URL or throws error
 */
export async function processImageFile(file: File): Promise<string> {
  // Validate file
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Convert to base64
  const base64 = await fileToBase64(file);

  // Resize if image is large
  const resized = await resizeImage(base64, 400);

  logger.log('✅ Image processed:', {
    originalSize: `${(file.size / 1024).toFixed(1)}KB`,
    resizedSize: `${(resized.length / 1024).toFixed(1)}KB`,
  });

  return resized;
}

/**
 * Get placeholder image data URL for personas without photos
 * Returns a simple SVG as data URL
 */
export function getPlaceholderImage(): string {
  const svg = `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="400" fill="#E5E7EB"/>
      <circle cx="200" cy="160" r="60" fill="#9CA3AF"/>
      <path d="M 100 320 Q 200 260 300 320" fill="#9CA3AF"/>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
