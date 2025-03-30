import { v4 as uuidv4 } from 'uuid';
import { getRedisClient } from './redis';

/**
 * Mask sensitive data in logs
 * @param value The value to mask
 * @returns Masked value
 */
export function maskSensitiveData(value: string | undefined): string {
  if (!value) return '';
  
  // For short strings, show first character and last character
  if (value.length <= 8) {
    return `${value.substring(0, 1)}${'*'.repeat(value.length - 2)}${value.substring(value.length - 1)}`;
  }
  
  // For longer strings, show first 2 and last 2 characters
  return `${value.substring(0, 2)}${'*'.repeat(value.length - 4)}${value.substring(value.length - 2)}`;
}

/**
 * Generate a unique request ID
 * @returns UUID string
 */
export function generateRequestId(): string {
  return uuidv4();
}

/**
 * Log state changes to Redis
 * @param type Type of state change
 * @param data Data associated with the state change
 */
export async function logStateChange(type: string, data: any) {
  try {
    const redis = await getRedisClient();
    
    // Create log entry
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      type,
      ...data
    };
    
    // Get the current date in YYYY-MM-DD format for the key
    const today = new Date().toISOString().split('T')[0];
    const logKey = `logs:${today}`;
    const recentKey = 'logs:recent';
    
    // Check if the key exists and what type it is
    const keyType = await redis.type(logKey);
    
    // If the key doesn't exist or is not a list, create it
    if (keyType === 'none' || keyType !== 'list') {
      // If it exists but is not a list, delete it first
      if (keyType !== 'none') {
        await redis.del(logKey);
      }
    }
    
    // Add the log entry to the list
    const logJson = JSON.stringify(logEntry);
    await redis.rPush(logKey, logJson);
    await redis.rPush(recentKey, logJson);
    
    // Trim the list to keep only the most recent 100 entries
    await redis.lTrim(recentKey, -100, -1);
    
    return true;
  } catch (error) {
    console.error('Error logging state:', error);
    return false;
  }
}
