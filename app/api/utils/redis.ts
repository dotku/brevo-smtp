import Redis from 'ioredis';

// Global Redis client for reuse between requests
let redisClient: Redis | null = null;

// List of sensitive environment variables that should be masked
const SENSITIVE_VARS = [
  'SMTP_PASS',
  'BREVO_API_KEY',
  'REDIS_URL',
  'LOG_API_KEY',
  'CRON_SECRET'
];

/**
 * Mask sensitive values in environment variables
 * @param variables List of environment variables
 * @returns Masked variables
 */
function maskSensitiveVariables(variables: string[]): string[] {
  return variables.map(variable => {
    if (SENSITIVE_VARS.includes(variable)) {
      return `${variable} (masked)`;
    }
    return variable;
  });
}

/**
 * Get a Redis client instance
 * @returns Redis client
 */
export async function getRedisClient() {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || '');
    
    redisClient.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    redisClient.on('connect', () => {
      console.log('Redis client connected');
    });
  }
  
  return redisClient;
}

/**
 * Track environment variable loading
 * @param source Source of environment variables (.env or .env.local)
 * @param variables List of variables loaded
 */
export async function trackEnvVarLoading(source: string, variables: string[]) {
  try {
    const client = await getRedisClient();
    const timestamp = new Date().toISOString();
    
    // Mask sensitive variables before storing
    const maskedVariables = maskSensitiveVariables(variables);
    
    // Store the event in Redis
    await client.lpush('env_loading_history', JSON.stringify({
      timestamp,
      source,
      variables: maskedVariables,
    }));
    
    // Keep only last 100 events
    await client.ltrim('env_loading_history', 0, 99);
    
    // Update latest state
    await client.hset('env_current_state', {
      last_loaded: timestamp,
      last_source: source,
      variables: JSON.stringify(maskedVariables),
    });
  } catch (error) {
    console.error('Failed to track env var loading:', error);
  }
}

/**
 * Get environment loading history
 * @param limit Number of records to retrieve
 */
export async function getEnvLoadingHistory(limit: number = 10) {
  try {
    const client = await getRedisClient();
    const history = await client.lrange('env_loading_history', 0, limit - 1);
    return history.map(item => JSON.parse(item));
  } catch (error) {
    console.error('Failed to get env loading history:', error);
    return [];
  }
}
