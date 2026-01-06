/**
 * @file app/api/route.ts
 * @description Base API route for health check and API info
 */

import { NextResponse } from 'next/server';

/**
 * API health check endpoint
 * 
 * @returns JSON response with API status and version
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    name: 'CopyWorx API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}

