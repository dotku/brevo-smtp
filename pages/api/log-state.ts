import type { NextApiRequest, NextApiResponse } from 'next';
import { logStateChange } from './utils';

type LogResponse = {
  success: boolean;
  message: string;
  [key: string]: any;
};

/**
 * API endpoint for logging state changes
 * This endpoint is used by the backend to log state changes
 * It does not have a frontend UI
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LogResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }
  
  try {
    const { type, data } = req.body;
    
    // Validate required fields
    if (!type || !data) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, data'
      });
    }
    
    // Log the state change
    const result = await logStateChange(type, data);
    
    if (result) {
      return res.status(200).json({
        success: true,
        message: 'State change logged successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to log state change'
      });
    }
  } catch (error) {
    console.error('Error logging state:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to log state change',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
