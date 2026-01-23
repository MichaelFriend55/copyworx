/**
 * @file lib/utils/api-auth.ts
 * @description Authentication utilities for API routes
 * 
 * Provides helper functions to get the authenticated user ID
 * from Clerk in Next.js API routes.
 */

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Error response for unauthorized requests
 */
export interface UnauthorizedResponse {
  error: string;
  details: string;
}

/**
 * Get the authenticated user ID from Clerk
 * Returns null if no user is authenticated
 */
export async function getUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Get the authenticated user ID or throw an error
 * Use this when authentication is required
 */
export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  
  if (!userId) {
    throw new Error('UNAUTHORIZED');
  }
  
  return userId;
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(): NextResponse<UnauthorizedResponse> {
  return NextResponse.json(
    { 
      error: 'Unauthorized',
      details: 'You must be logged in to access this resource'
    },
    { status: 401 }
  );
}

/**
 * Create a not found response
 */
export function notFoundResponse(resource: string): NextResponse {
  return NextResponse.json(
    { 
      error: 'Not found',
      details: `${resource} not found`
    },
    { status: 404 }
  );
}

/**
 * Create a bad request response
 */
export function badRequestResponse(message: string): NextResponse {
  return NextResponse.json(
    { 
      error: 'Bad request',
      details: message
    },
    { status: 400 }
  );
}

/**
 * Create an internal error response
 */
export function internalErrorResponse(error: unknown): NextResponse {
  console.error('API Error:', error);
  
  return NextResponse.json(
    { 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    },
    { status: 500 }
  );
}
