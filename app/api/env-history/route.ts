import { NextRequest, NextResponse } from 'next/server';
import { getEnvLoadingHistory } from '../utils/redis';

export async function GET(request: NextRequest) {
  try {
    const history = await getEnvLoadingHistory(20); // Get last 20 records
    return NextResponse.json({
      success: true,
      history
    });
  } catch (error) {
    console.error('Failed to get env loading history:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to get environment loading history'
    }, { status: 500 });
  }
}
