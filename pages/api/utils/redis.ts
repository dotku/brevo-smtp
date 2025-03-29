import { createClient } from 'redis';

// Global Redis client for reuse between requests
let redisClient: any = null;

/**
 * Get a Redis client instance
 * @returns Redis client
 */
export async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL
    });
    
    // Connect to Redis if not already connected
    if (!redisClient.isOpen) {
      try {
        await redisClient.connect();
        console.log('Redis client connected');
      } catch (error) {
        console.error('Redis connection error:', error);
        throw error;
      }
    }
  }
  
  return redisClient;
}
