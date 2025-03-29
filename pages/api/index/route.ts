import { NextResponse } from 'next/server';

/**
 * GET handler for API health check
 * Returns basic API status information
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'API is running',
    version: '1.0.0',
    endpoints: [
      { path: '/api/email', description: 'Email sending API' },
      { path: '/api/log-state', description: 'Backend logging API' },
      { path: '/api/cron/route', description: 'Cron job for log cleanup' }
    ]
  });
}
