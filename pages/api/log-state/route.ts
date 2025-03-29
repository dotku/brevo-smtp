import { NextRequest, NextResponse } from 'next/server';
import { logStateChange } from '../utils';

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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;
    
    // Validate required fields
    if (!type || !data) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: type, data'
      }, { status: 400 });
    }
    
    // Log the state change
    const result = await logStateChange(type, data);
    
    if (result) {
      return NextResponse.json({
        success: true,
        message: 'State change logged successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Failed to log state change'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error logging state:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to log state change',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
