/**
 * @file lib/utils/error-handling.ts
 * @description Centralized error handling utilities for consistent error management
 * 
 * Provides:
 * - User-friendly error message formatting
 * - Error logging
 * - Error type classification
 * - Retry logic
 */

// ============================================================================
// Constants
// ============================================================================

/** Maximum text length for API requests (10,000 characters) */
export const MAX_TEXT_LENGTH = 10000;

/** Maximum persona photo size (2MB) */
export const MAX_PHOTO_SIZE = 2 * 1024 * 1024;

/** Allowed image formats for persona photos */
export const ALLOWED_IMAGE_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/** API request timeout in milliseconds (30 seconds) */
export const API_TIMEOUT = 30000;

/** localStorage quota warning threshold (80%) */
export const STORAGE_WARNING_THRESHOLD = 0.8;

// ============================================================================
// Error Types
// ============================================================================

export type ErrorType = 
  | 'validation'
  | 'network'
  | 'timeout'
  | 'storage'
  | 'api'
  | 'unknown';

export interface AppError {
  type: ErrorType;
  message: string;
  userMessage: string;
  details?: unknown;
  retryable: boolean;
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Classify error type based on error object
 */
export function classifyError(error: unknown): ErrorType {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'network';
  }
  
  if (error instanceof Error) {
    if (error.message.includes('timeout') || error.message.includes('timed out')) {
      return 'timeout';
    }
    if (error.message.includes('quota') || error.message.includes('storage')) {
      return 'storage';
    }
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return 'validation';
    }
    if (error.message.includes('API') || error.message.includes('Claude')) {
      return 'api';
    }
  }
  
  return 'unknown';
}

/**
 * Create a standardized AppError from any error
 */
export function createAppError(error: unknown, context?: string): AppError {
  const errorType = classifyError(error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Generate user-friendly message
  let userMessage: string;
  let retryable = false;
  
  switch (errorType) {
    case 'network':
      userMessage = 'Network error. Please check your connection and try again.';
      retryable = true;
      break;
      
    case 'timeout':
      userMessage = 'Request timed out. Please try again with shorter text or check your connection.';
      retryable = true;
      break;
      
    case 'storage':
      userMessage = 'Storage limit reached. Please clear some data or use a different browser.';
      retryable = false;
      break;
      
    case 'api':
      userMessage = 'AI service error. Please try again in a moment.';
      retryable = true;
      break;
      
    case 'validation':
      userMessage = errorMessage; // Validation errors are already user-friendly
      retryable = false;
      break;
      
    default:
      userMessage = 'An unexpected error occurred. Please try again.';
      retryable = true;
  }
  
  // Add context if provided
  if (context) {
    userMessage = `${context}: ${userMessage}`;
  }
  
  return {
    type: errorType,
    message: errorMessage,
    userMessage,
    details: error,
    retryable,
  };
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate text length for API requests
 * @throws Error if text exceeds maximum length
 */
export function validateTextLength(text: string, fieldName: string = 'Text'): void {
  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(
      `${fieldName} exceeds maximum length of ${MAX_TEXT_LENGTH.toLocaleString()} characters. ` +
      `Current length: ${text.length.toLocaleString()} characters. ` +
      `Please shorten your text and try again.`
    );
  }
}

/**
 * Validate text is not empty
 * @throws Error if text is empty
 */
export function validateNotEmpty(text: string, fieldName: string = 'Text'): void {
  if (!text || text.trim().length === 0) {
    throw new Error(`${fieldName} cannot be empty.`);
  }
}

/**
 * Validate image file for persona photo
 * @throws Error if image is invalid
 */
export function validateImage(file: File): void {
  // Check file size
  if (file.size > MAX_PHOTO_SIZE) {
    throw new Error(
      `Image size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum of 2MB. ` +
      `Please choose a smaller image.`
    );
  }
  
  // Check file format
  if (!ALLOWED_IMAGE_FORMATS.includes(file.type)) {
    throw new Error(
      `Invalid image format (${file.type}). ` +
      `Allowed formats: JPEG, PNG, WebP.`
    );
  }
}

/**
 * Validate project name
 * @throws Error if name is invalid
 */
export function validateProjectName(name: string): void {
  validateNotEmpty(name, 'Project name');
  
  if (name.length > 100) {
    throw new Error('Project name cannot exceed 100 characters.');
  }
  
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(name)) {
    throw new Error('Project name contains invalid characters.');
  }
}

/**
 * Validate brand voice data
 * @throws Error if brand voice is invalid
 */
export function validateBrandVoice(brandName: string): void {
  validateNotEmpty(brandName, 'Brand name');
  
  if (brandName.length > 100) {
    throw new Error('Brand name cannot exceed 100 characters.');
  }
}

/**
 * Validate persona data
 * @throws Error if persona is invalid
 */
export function validatePersona(name: string): void {
  validateNotEmpty(name, 'Persona name');
  
  if (name.length > 100) {
    throw new Error('Persona name cannot exceed 100 characters.');
  }
}

// ============================================================================
// Storage Functions
// ============================================================================

/**
 * Check localStorage quota and return usage percentage
 * @returns Usage percentage (0-100)
 */
export function checkStorageQuota(): number {
  if (typeof window === 'undefined') return 0;
  
  try {
    // Estimate localStorage usage
    let totalSize = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    
    // Typical localStorage limit is 5-10MB
    // We'll use 5MB as conservative estimate
    const limitBytes = 5 * 1024 * 1024;
    const usagePercent = (totalSize / limitBytes) * 100;
    
    if (usagePercent > STORAGE_WARNING_THRESHOLD * 100) {
      logWarning(
        `localStorage is ${usagePercent.toFixed(1)}% full (${(totalSize / 1024).toFixed(0)}KB used)`
      );
    }
    
    return usagePercent;
  } catch (error) {
    logError(error, 'checkStorageQuota');
    return 0;
  }
}

/**
 * Check if localStorage is available and has space
 * @throws Error if storage is not available or full
 */
export function ensureStorageAvailable(): void {
  if (typeof window === 'undefined') {
    throw new Error('Storage not available in non-browser environment');
  }
  
  try {
    // Test write capability
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
  } catch (error) {
    if (error instanceof DOMException && error.code === 22) {
      throw new Error(
        'Storage quota exceeded. Please clear some data or use a different browser.'
      );
    }
    throw new Error('Storage not available. Please enable localStorage in your browser.');
  }
  
  // Check quota
  const usage = checkStorageQuota();
  if (usage > 95) {
    throw new Error(
      'Storage is nearly full (95% used). Please clear some data before continuing.'
    );
  }
}

// ============================================================================
// API Helper Functions
// ============================================================================

/**
 * Fetch with timeout
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeout - Timeout in milliseconds
 * @returns Response promise
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(
        `Request timed out after ${timeout / 1000} seconds. ` +
        `Please try again with shorter text or check your connection.`
      );
    }
    
    throw error;
  }
}

/**
 * Retry function with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param baseDelay - Base delay in milliseconds
 * @returns Result of function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on validation errors
      if (classifyError(error) === 'validation') {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      logWarning(`Retry attempt ${attempt + 1}/${maxRetries} in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// ============================================================================
// Error Logging
// ============================================================================

/**
 * Log error to console with context
 */
export function logError(error: unknown, context: string): void {
  const appError = createAppError(error, context);
  
  console.error('❌ Error:', {
    context,
    type: appError.type,
    message: appError.message,
    userMessage: appError.userMessage,
    retryable: appError.retryable,
    details: appError.details,
  });
}

/**
 * Log warning to console
 */
export function logWarning(message: string, details?: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    console.warn('⚠️ Warning:', message, details);
  }
}

// ============================================================================
// User Message Formatting
// ============================================================================

/**
 * Format error message for display to user
 */
export function formatErrorForUser(error: unknown, context?: string): string {
  const appError = createAppError(error, context);
  return appError.userMessage;
}

/**
 * Get retry suggestion based on error
 */
export function getRetrySuggestion(error: unknown): string | null {
  const appError = createAppError(error);
  
  if (!appError.retryable) {
    return null;
  }
  
  switch (appError.type) {
    case 'network':
      return 'Check your connection and try again';
    case 'timeout':
      return 'Try with shorter text or try again later';
    case 'api':
      return 'Try again in a moment';
    default:
      return 'Try again';
  }
}
