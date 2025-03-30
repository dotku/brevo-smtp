import { NextRequest, NextResponse } from 'next/server';

/**
 * API health check endpoint
 * Returns basic API status information
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'API is running',
    version: '1.0.0',
    endpoints: [
      { path: '/api/email', description: 'Email sending API' },
      { path: '/api/log-state', description: 'Backend logging API' },
      { path: '/api/cron/cleanup-logs', description: 'Cron job for log cleanup' }
    ]
  });
}
