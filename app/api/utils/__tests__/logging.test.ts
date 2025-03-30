import { logStateChange } from '../logging';
import { getRedisClient } from '../redis';

jest.mock('../redis');

describe('Logging Utils', () => {
  const mockRedis = {
    type: jest.fn(),
    del: jest.fn(),
    rpush: jest.fn(),
    ltrim: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockResolvedValue(mockRedis);
  });

  it('should log state change successfully', async () => {
    mockRedis.type.mockResolvedValue('list');
    mockRedis.rpush.mockResolvedValue(1);
    mockRedis.ltrim.mockResolvedValue('OK');

    const result = await logStateChange('test_event', { data: 'test' });

    expect(result).toBe(true);
    expect(mockRedis.rpush).toHaveBeenCalledTimes(2);
    expect(mockRedis.ltrim).toHaveBeenCalledTimes(1);
  });

  it('should create new list if key does not exist', async () => {
    mockRedis.type.mockResolvedValue('none');
    mockRedis.rpush.mockResolvedValue(1);
    mockRedis.ltrim.mockResolvedValue('OK');

    const result = await logStateChange('test_event', { data: 'test' });

    expect(result).toBe(true);
    expect(mockRedis.del).not.toHaveBeenCalled();
    expect(mockRedis.rpush).toHaveBeenCalledTimes(2);
  });

  it('should recreate list if key exists but is not a list', async () => {
    mockRedis.type.mockResolvedValue('string');
    mockRedis.rpush.mockResolvedValue(1);
    mockRedis.ltrim.mockResolvedValue('OK');

    const result = await logStateChange('test_event', { data: 'test' });

    expect(result).toBe(true);
    expect(mockRedis.del).toHaveBeenCalled();
    expect(mockRedis.rpush).toHaveBeenCalledTimes(2);
  });

  it('should handle Redis errors', async () => {
    mockRedis.type.mockRejectedValue(new Error('Redis error'));

    const result = await logStateChange('test_event', { data: 'test' });

    expect(result).toBe(false);
  });
});
