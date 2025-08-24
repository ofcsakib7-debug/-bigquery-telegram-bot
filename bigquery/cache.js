// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 1
// Phase: 2
// Component: master_cache_implementation
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 14:00 UTC
// Next Step: Implement cache expiration and cleanup
// =============================================

const { BigQuery } = require('@google-cloud/bigquery');
const crypto = require('crypto');

// Lazy initialization of BigQuery client
let bigquery = null;
function getBigQuery() {
  if (!bigquery) {
    bigquery = new BigQuery();
  }
  return bigquery;
}

/**
 * Generate cache key based on type, user ID, and context
 * @param {string} type - Cache type
 * @param {string} userId - User ID
 * @param {string} context - Context identifier
 * @returns {string} Cache key
 */
function generateCacheKey(type, userId, context) {
  return `${type}:${userId}:${context}`;
}

/**
 * Get data from master cache
 * @param {string} cacheKey - Cache key
 * @returns {Object|null} Cached data or null if not found
 */
async function getFromCache(cacheKey) {
  try {
    const query = `
      SELECT cached_data, expires_at
      FROM \`${process.env.BIGQUERY_DATASET_ID || 'business_operations'}.master_cache\`
      WHERE cache_key = @cacheKey
      AND expires_at > CURRENT_TIMESTAMP()
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: { cacheKey }
    };
    
    const [rows] = await getBigQuery().query(options);
    
    if (rows.length > 0) {
      // Increment hit count
      await incrementCacheHitCount(cacheKey);
      
      // Parse and return cached data
      return JSON.parse(rows[0].cached_data);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting data from cache:', error);
    return null;
  }
}

/**
 * Store data in master cache
 * @param {string} cacheKey - Cache key
 * @param {Object} data - Data to cache
 * @param {number} ttlHours - Time to live in hours (default: 1)
 */
async function storeInCache(cacheKey, data, ttlHours = 1) {
  try {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    
    const query = `
      MERGE \`${process.env.BIGQUERY_DATASET_ID || 'business_operations'}.master_cache\` T
      USING (SELECT @cacheKey as cache_key) S
      ON T.cache_key = S.cache_key
      WHEN MATCHED THEN
        UPDATE SET 
          cached_data = @cachedData,
          expires_at = @expiresAt,
          hit_count = 0,
          last_accessed = CURRENT_TIMESTAMP(),
          updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN
        INSERT (cache_key, cached_data, expires_at, created_at, updated_at)
        VALUES (@cacheKey, @cachedData, @expiresAt, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: {
        cacheKey,
        cachedData: JSON.stringify(data),
        expiresAt: expiresAt.toISOString()
      }
    };
    
    await getBigQuery().query(options);
    
  } catch (error) {
    console.error('Error storing data in cache:', error);
  }
}

/**
 * Increment cache hit count
 * @param {string} cacheKey - Cache key
 */
async function incrementCacheHitCount(cacheKey) {
  try {
    const query = `
      UPDATE \`${process.env.BIGQUERY_DATASET_ID || 'business_operations'}.master_cache\`
      SET 
        hit_count = hit_count + 1,
        last_accessed = CURRENT_TIMESTAMP()
      WHERE cache_key = @cacheKey
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: { cacheKey }
    };
    
    await getBigQuery().query(options);
  } catch (error) {
    console.error('Error incrementing cache hit count:', error);
  }
}

/**
 * Clean up expired cache entries
 */
async function cleanupExpiredCache() {
  try {
    const query = `
      DELETE FROM \`${process.env.BIGQUERY_DATASET_ID || 'business_operations'}.master_cache\`
      WHERE expires_at < CURRENT_TIMESTAMP()
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    await getBigQuery().query(options);
    
    console.log('Expired cache entries cleaned up');
    
  } catch (error) {
    console.error('Error cleaning up expired cache entries:', error);
  }
}

/**
 * Get cached department options for a user
 * @param {string} userId - User ID
 * @param {string} departmentId - Department ID
 * @returns {Object|null} Department options or null if not cached
 */
async function getCachedDepartmentOptions(userId, departmentId) {
  const cacheKey = generateCacheKey('department_options', userId, departmentId);
  return await getFromCache(cacheKey);
}

/**
 * Cache department options for a user
 * @param {string} userId - User ID
 * @param {string} departmentId - Department ID
 * @param {Object} options - Department options
 */
async function cacheDepartmentOptions(userId, departmentId, options) {
  const cacheKey = generateCacheKey('department_options', userId, departmentId);
  await storeInCache(cacheKey, options, 24); // Cache for 24 hours
}

/**
 * Get cached bank accounts for a branch
 * @param {string} branchId - Branch ID
 * @returns {Array|null} Bank accounts or null if not cached
 */
async function getCachedBankAccounts(branchId) {
  const cacheKey = generateCacheKey('bank_accounts', 'branch', branchId);
  return await getFromCache(cacheKey);
}

/**
 * Cache bank accounts for a branch
 * @param {string} branchId - Branch ID
 * @param {Array} bankAccounts - Bank accounts
 */
async function cacheBankAccounts(branchId, bankAccounts) {
  const cacheKey = generateCacheKey('bank_accounts', 'branch', branchId);
  await storeInCache(cacheKey, bankAccounts, 6); // Cache for 6 hours
}

// Export functions
module.exports = {
  generateCacheKey,
  getFromCache,
  storeInCache,
  cleanupExpiredCache,
  getCachedDepartmentOptions,
  cacheDepartmentOptions,
  getCachedBankAccounts,
  cacheBankAccounts
};