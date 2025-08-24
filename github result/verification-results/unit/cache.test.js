// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: Testing
// Phase: 1
// Component: cache_functionality_tests
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 18:00 UTC
// Next Step: Implement tests for cache key generation
// =============================================

const { generateCacheKey } = require('../../bigquery/cache');

// Mock BigQuery
jest.mock('@google-cloud/bigquery');
const { BigQuery } = require('@google-cloud/bigquery');
const mockBigQuery = {
  query: jest.fn()
};
BigQuery.mockImplementation(() => mockBigQuery);

const { getFromCache, storeInCache } = require('../../bigquery/cache');

describe('Cache Functionality', () => {
  describe('generateCacheKey', () => {
    test('should generate cache key with all components', () => {
      const key = generateCacheKey('department_options', 'user123', 'finance');
      expect(key).toBe('department_options:user123:finance');
    });

    test('should generate cache key with numeric user ID', () => {
      const key = generateCacheKey('bank_accounts', '12345', 'branch789');
      expect(key).toBe('bank_accounts:12345:branch789');
    });
  });

  describe('getFromCache', () => {
    beforeEach(() => {
      mockBigQuery.query.mockClear();
    });

    test('should query cache with correct parameters', async () => {
      // Mock query result
      mockBigQuery.query.mockResolvedValue([[]]);

      await getFromCache('test:key:value');

      expect(mockBigQuery.query).toHaveBeenCalledWith({
        query: expect.stringContaining('master_cache'),
        location: 'us-central1',
        params: { cacheKey: 'test:key:value' }
      });
    });

    test('should return parsed cached data when found', async () => {
      // Mock query result with cached data
      const cachedData = { test: 'data', value: 123 };
      mockBigQuery.query.mockResolvedValue([[
        { cached_data: JSON.stringify(cachedData), expires_at: new Date(Date.now() + 3600000) }
      ]]);

      const result = await getFromCache('test:key:value');
      expect(result).toEqual(cachedData);
    });

    test('should return null when cache entry not found', async () => {
      // Mock query result with no data
      mockBigQuery.query.mockResolvedValue([[]]);

      const result = await getFromCache('test:key:value');
      expect(result).toBeNull();
    });

    test('should return null when cache entry is expired', async () => {
      // Mock query result with expired data
      mockBigQuery.query.mockResolvedValue([[
        { cached_data: JSON.stringify({ test: 'data' }), expires_at: new Date(Date.now() - 3600000) }
      ]]);

      const result = await getFromCache('test:key:value');
      expect(result).toBeNull();
    });
  });

  describe('storeInCache', () => {
    beforeEach(() => {
      mockBigQuery.query.mockClear();
    });

    test('should store data in cache with correct parameters', async () => {
      // Mock query result
      mockBigQuery.query.mockResolvedValue([[]]);

      const testData = { test: 'data', value: 123 };
      await storeInCache('test:key:value', testData, 1);

      expect(mockBigQuery.query).toHaveBeenCalledWith({
        query: expect.stringContaining('MERGE'),
        location: 'us-central1',
        params: expect.objectContaining({
          cacheKey: 'test:key:value',
          cachedData: JSON.stringify(testData)
        })
      });
    });

    test('should set correct expiration time', async () => {
      // Mock query result
      mockBigQuery.query.mockResolvedValue([[]]);

      const testData = { test: 'data' };
      const ttlHours = 2;
      const expectedExpiration = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

      await storeInCache('test:key:value', testData, ttlHours);

      // Check that expiration time is approximately correct (within 1 second)
      const callArgs = mockBigQuery.query.mock.calls[0][0];
      const actualExpiration = new Date(callArgs.params.expiresAt);
      const timeDifference = Math.abs(actualExpiration.getTime() - expectedExpiration.getTime());
      expect(timeDifference).toBeLessThan(1000);
    });
  });
});