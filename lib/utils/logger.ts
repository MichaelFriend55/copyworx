/**
 * @file lib/utils/logger.ts
 * @description Development-only logging utility
 * 
 * Provides console logging that only runs in development mode.
 * All log statements are stripped in production builds for performance.
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * Development-only logger
 * All methods are no-ops in production
 */
export const logger = {
  /**
   * Log informational message (development only)
   */
  log: (...args: unknown[]): void => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log warning message (development only)
   */
  warn: (...args: unknown[]): void => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log error message (always logs - errors should be visible)
   */
  error: (...args: unknown[]): void => {
    console.error(...args);
  },

  /**
   * Log info message (development only)
   */
  info: (...args: unknown[]): void => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Log debug message (development only)
   */
  debug: (...args: unknown[]): void => {
    if (isDev) {
      console.debug(...args);
    }
  },
};

/**
 * Conditional log that executes callback only in development
 * Useful for complex log formatting
 */
export function devOnly(callback: () => void): void {
  if (isDev) {
    callback();
  }
}

export default logger;
