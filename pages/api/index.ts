import type { NextApiRequest, NextApiResponse } from 'next';

type ApiResponse = {
  success: boolean;
  message: string;
  version?: string;
  endpoints?: Array<{
    path: string;
    description: string;
  }>;
};

/**
 * API health check endpoint
 * Returns basic API status information
 */
export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
  
  return res.status(200).json({
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
