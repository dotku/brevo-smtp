import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';

// Define the StateLogEntry type
type StateLogEntry = {
  timestamp: string;
  type: string;
  requestId?: string;
  data: any;
};

// Global Redis client for reuse between requests
let redisClient: any = null;

// Function to get a Redis client
async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL
    });
    
    // Connect to Redis if not already connected
    if (!redisClient.isOpen) {
      try {
        await redisClient.connect();
        console.log('Redis client connected in cleanup-logs');
      } catch (error) {
        console.error('Redis connection error in cleanup-logs:', error);
        throw error;
      }
    }
  }
  
  return redisClient;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Verify the request is from Vercel Cron (skip in development mode if accessing from localhost)
  const authHeader = req.headers.authorization;
  const isLocalhost = req.headers.host?.includes('localhost') || req.headers.host?.includes('127.0.0.1');
  
  if (!isDevelopment || !isLocalhost) {
    // In production or when not accessing from localhost, require authorization
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  }

  try {
    // Get Redis client
    const redis = await getRedisClient();
    
    // Get all keys that match the state-logs pattern
    const keys = await redis.keys('state-logs:*');
    
    // Current date for comparison
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Track what we've deleted
    const deletedKeys: string[] = [];
    
    // Process each key
    for (const key of keys) {
      // Skip the 'recent' key and today/yesterday's logs
      if (key === 'state-logs:recent') continue;
      
      // Extract date from key (format: state-logs:YYYY-MM-DD)
      const keyParts = key.split(':');
      if (keyParts.length !== 2) continue;
      
      const dateStr = keyParts[1];
      
      // Skip if it's today or yesterday
      if (dateStr >= yesterdayStr) continue;
      
      // Delete old logs
      await redis.del(key);
      deletedKeys.push(key);
    }
    
    // Log the cleanup operation
    const cleanupLog: StateLogEntry = {
      timestamp: new Date().toISOString(),
      type: 'log_cleanup',
      requestId: 'cleanup-job',
      data: {
        deletedKeys,
        retainedDates: [yesterdayStr, now.toISOString().split('T')[0]]
      }
    };
    
    // Add to recent logs
    let recentLogs: StateLogEntry[] = [];
    const recentLogsStr = await redis.get('state-logs:recent');
    if (recentLogsStr) {
      recentLogs = JSON.parse(recentLogsStr) as StateLogEntry[];
    }
    
    recentLogs.unshift(cleanupLog);
    
    // Keep only last 50 entries
    if (recentLogs.length > 50) {
      recentLogs = recentLogs.slice(0, 50);
    }
    
    await redis.set('state-logs:recent', JSON.stringify(recentLogs));
    
    return res.status(200).json({ 
      success: true, 
      message: 'Log cleanup completed successfully',
      deletedKeys,
      timestamp: now.toISOString()
    });
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to clean up logs',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
