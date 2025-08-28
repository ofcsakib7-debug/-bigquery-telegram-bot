// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 1
// Component: search_implementation
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 12:15 UTC
// Next Step: Implement BQML model training
// =============================================

const { BigQuery } = require('@google-cloud/bigquery');
const { Firestore } = require('@google-cloud/firestore');

// Lazy initialization of clients
let bigquery = null;
let firestore = null;

function getBigQuery() {
  if (!bigquery) {
    bigquery = new BigQuery();
  }
  return bigquery;
}

function getFirestore() {
  if (!firestore) {
    firestore = new Firestore();
  }
  return firestore;
}

/**
 * Generate cache key for search results
 * @param {string} type - Cache type
 * @param {string} userId - User ID
 * @param {string} context - Search context
 * @returns {string} Cache key
 */
function generateSearchCacheKey(type, userId, context) {
  return `${type}:${userId}:${context}`;
}

/**
 * Get search results from cache
 * @param {string} cacheKey - Cache key
 * @returns {Object|null} Cached data or null if not found/expired
 */
async function getFromSearchCache(cacheKey) {
  try {
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Determine which cache table to use based on cache key prefix
    let tableName = 'master_cache'; // Default fallback
    if (cacheKey.startsWith('inv:')) {
      tableName = 'inventory_search_cache';
    } else if (cacheKey.startsWith('acc:')) {
      tableName = 'accounting_search_cache';
    } else if (cacheKey.startsWith('sal:')) {
      tableName = 'sales_search_cache';
    } else if (cacheKey.startsWith('ser:')) {
      tableName = 'service_search_cache';
    } else if (cacheKey.startsWith('mkt:')) {
      tableName = 'marketing_search_cache';
    }
    
    const query = `
      SELECT result_data, expires_at
      FROM \`${datasetId}.${tableName}\`
      WHERE cache_key = @cacheKey
      AND expires_at > CURRENT_TIMESTAMP()
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: { cacheKey }
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    if (rows.length > 0) {
      // Increment hit count
      await incrementSearchCacheHitCount(tableName, cacheKey);
      return JSON.parse(rows[0].result_data);
    }
    
    return null;
  } catch (error) {
    console.error('Error getting data from search cache:', error);
    return null;
  }
}

/**
 * Store search results in cache
 * @param {string} cacheKey - Cache key
 * @param {Object} data - Data to cache
 * @param {number} ttlHours - Time to live in hours (default: 1)
 */
async function storeInSearchCache(cacheKey, data, ttlHours = 1) {
  try {
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Determine which cache table to use based on cache key prefix
    let tableName = 'master_cache'; // Default fallback
    if (cacheKey.startsWith('inv:')) {
      tableName = 'inventory_search_cache';
    } else if (cacheKey.startsWith('acc:')) {
      tableName = 'accounting_search_cache';
    } else if (cacheKey.startsWith('sal:')) {
      tableName = 'sales_search_cache';
    } else if (cacheKey.startsWith('ser:')) {
      tableName = 'service_search_cache';
    } else if (cacheKey.startsWith('mkt:')) {
      tableName = 'marketing_search_cache';
    }
    
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    
    const query = `
      MERGE \`${datasetId}.${tableName}\` T
      USING (SELECT @cacheKey as cache_key) S
      ON T.cache_key = S.cache_key
      WHEN MATCHED THEN
        UPDATE SET 
          result_data = @resultData,
          expires_at = @expiresAt,
          hit_count = 0,
          last_accessed = CURRENT_TIMESTAMP(),
          updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN
        INSERT (cache_key, result_data, expires_at, created_at, updated_at)
        VALUES (@cacheKey, @resultData, @expiresAt, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: {
        cacheKey,
        resultData: JSON.stringify(data),
        expiresAt: expiresAt.toISOString()
      }
    };
    
    await bigqueryClient.query(options);
    
  } catch (error) {
    console.error('Error storing data in search cache:', error);
  }
}

/**
 * Increment search cache hit count
 * @param {string} tableName - Table name
 * @param {string} cacheKey - Cache key
 */
async function incrementSearchCacheHitCount(tableName, cacheKey) {
  try {
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    const query = `
      UPDATE \`${datasetId}.${tableName}\`
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
    
    await bigqueryClient.query(options);
  } catch (error) {
    console.error('Error incrementing search cache hit count:', error);
  }
}

/**
 * Clean up expired search cache entries
 * @param {string} tableName - Table name to clean
 */
async function cleanupExpiredSearchCache(tableName) {
  try {
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    const query = `
      DELETE FROM \`${datasetId}.${tableName}\`
      WHERE expires_at < CURRENT_TIMESTAMP()
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    await bigqueryClient.query(options);
    
    console.log(`Expired entries cleaned up from ${tableName}`);
    
  } catch (error) {
    console.error(`Error cleaning up expired entries from ${tableName}:`, error);
  }
}

/**
 * Interpret user search input using pattern matching
 * @param {string} userId - User ID
 * @param {string} inputText - Raw user input
 * @param {string} departmentId - Department ID
 * @returns {Object} Interpreted search query
 */
async function interpretSearchInput(userId, inputText, departmentId) {
  try {
    // First, check if we have this exact pattern in our intention patterns
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    const query = `
      SELECT 
        expanded_query,
        query_type,
        priority_score
      FROM \`${datasetId}.search_intention_patterns\`
      WHERE 
        department_id = @departmentId
        AND pattern = @inputText
      ORDER BY priority_score DESC
      LIMIT 1
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: {
        departmentId,
        inputText
      }
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    if (rows.length > 0) {
      // Found exact pattern match
      const pattern = rows[0];
      
      // Log this interaction
      await logSearchInteraction(userId, departmentId, inputText, pattern.expanded_query, pattern.query_type, pattern.priority_score, true);
      
      return {
        interpretedQuery: pattern.expanded_query,
        queryType: pattern.query_type,
        confidenceScore: Math.min(0.95, pattern.priority_score + 0.1) // Boost confidence for exact match
      };
    }
    
    // No exact match, try fuzzy matching or use generic interpretation
    const interpreted = performGenericSearchInterpretation(inputText, departmentId);
    
    // Log this interaction
    await logSearchInteraction(userId, departmentId, inputText, interpreted.interpretedQuery, interpreted.queryType, 0.3, false);
    
    return interpreted;
  } catch (error) {
    console.error('Error interpreting search input:', error);
    
    // Fallback to generic interpretation
    const interpreted = performGenericSearchInterpretation(inputText, departmentId);
    return {
      ...interpreted,
      confidenceScore: 0.2 // Lower confidence for error case
    };
  }
}

/**
 * Perform generic search interpretation based on keywords
 * @param {string} inputText - Raw user input
 * @param {string} departmentId - Department ID
 * @returns {Object} Interpreted search query
 */
function performGenericSearchInterpretation(inputText, departmentId) {
  const lowerInput = inputText.toLowerCase();
  
  // Common patterns and keywords
  const patterns = {
    accounting: {
      payment: ['payment', 'pay', 'paid', 'receipt'],
      expense: ['expense', 'exp', 'cost', 'bill'],
      report: ['report', 'summary', 'total'],
      bank: ['bank', 'bk', 'bnk'],
      cash: ['cash', 'cs'],
      voucher: ['voucher', 'vchr']
    },
    sales: {
      challan: ['challan', 'delivery', 'dlv'],
      customer: ['customer', 'client', 'cust'],
      payment: ['payment', 'pay', 'received'],
      order: ['order', 'ord'],
      stock: ['stock', 'stk', 'quantity', 'qty']
    },
    inventory: {
      stock: ['stock', 'stk', 'quantity', 'qty'],
      machine: ['machine', 'mach', 'model'],
      part: ['part', 'component'],
      availability: ['available', 'avl', 'instock']
    },
    service: {
      ticket: ['ticket', 'tkt', 'service'],
      technician: ['technician', 'tech'],
      repair: ['repair', 'fix'],
      maintenance: ['maintenance', 'maint']
    }
  };
  
  // Determine query type based on department and keywords
  let queryType = 'GENERAL_SEARCH';
  let confidenceScore = 0.3; // Default low confidence
  
  if (patterns[departmentId.toLowerCase()]) {
    const deptPatterns = patterns[departmentId.toLowerCase()];
    
    // Find the best matching pattern
    for (const [type, keywords] of Object.entries(deptPatterns)) {
      for (const keyword of keywords) {
        if (lowerInput.includes(keyword)) {
          queryType = type.toUpperCase();
          confidenceScore = 0.6; // Moderate confidence
          break;
        }
      }
      
      if (confidenceScore > 0.3) break; // Found a match
    }
  }
  
  // Try to expand common abbreviations
  let expandedQuery = inputText;
  
  // Common abbreviation expansions
  const expansions = {
    't ': 'total ',
    'cm': 'current month',
    'lm': 'last month',
    'ly': 'last year',
    'lw': 'last week',
    'tw': 'this week',
    'bnk': 'bank',
    'exp': 'expense',
    'dlv': 'delivery',
    'chln': 'challan',
    'cust': 'customer',
    'clnt': 'client',
    'py': 'payment',
    'rcvd': 'received',
    'ord': 'order',
    'stk': 'stock',
    'qty': 'quantity',
    'mach': 'machine',
    'mdl': 'model',
    'prt': 'part',
    'cmpnt': 'component',
    'avl': 'available',
    'instk': 'in stock',
    'tkt': 'ticket',
    'srv': 'service',
    'tech': 'technician',
    'rpr': 'repair',
    'mnt': 'maintenance',
    'fix': 'repair'
  };
  
  for (const [abbr, expansion] of Object.entries(expansions)) {
    expandedQuery = expandedQuery.replace(new RegExp(`\\b${abbr}\\b`, 'gi'), expansion);
  }
  
  return {
    interpretedQuery: expandedQuery,
    queryType: queryType,
    confidenceScore: confidenceScore
  };
}

/**
 * Log search interaction for BQML training
 * @param {string} userId - User ID
 * @param {string} departmentId - Department ID
 * @param {string} inputText - Raw input text
 * @param {string} interpretedQuery - Interpreted query
 * @param {string} queryType - Query type
 * @param {number} confidenceScore - Confidence score (0.0-1.0)
 * @param {boolean} exactMatch - Whether this was an exact pattern match
 */
async function logSearchInteraction(userId, departmentId, inputText, interpretedQuery, queryType, confidenceScore, exactMatch) {
  try {
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Generate interaction ID
    const interactionId = `INT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    const query = `
      INSERT INTO \`${datasetId}.search_interactions\`
      (interaction_id, user_id, department_id, input_text, interpreted_query, query_type, confidence_score, selected_alternative, successful_completion, timestamp)
      VALUES
      (@interactionId, @userId, @departmentId, @inputText, @interpretedQuery, @queryType, @confidenceScore, FALSE, FALSE, CURRENT_TIMESTAMP())
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: {
        interactionId,
        userId,
        departmentId,
        inputText,
        interpretedQuery,
        queryType,
        confidenceScore,
        exactMatch
      }
    };
    
    await bigqueryClient.query(options);
    
    // If this was an exact match, update the pattern usage count
    if (exactMatch) {
      await updatePatternUsage(departmentId, inputText);
    }
  } catch (error) {
    console.error('Error logging search interaction:', error);
  }
}

/**
 * Update pattern usage count for BQML training
 * @param {string} departmentId - Department ID
 * @param {string} pattern - Pattern text
 */
async function updatePatternUsage(departmentId, pattern) {
  try {
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    const query = `
      UPDATE \`${datasetId}.search_intention_patterns\`
      SET 
        usage_count = usage_count + 1,
        last_used = CURRENT_TIMESTAMP(),
        updated_at = CURRENT_TIMESTAMP()
      WHERE 
        department_id = @departmentId
        AND pattern = @pattern
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: {
        departmentId,
        pattern
      }
    };
    
    await bigqueryClient.query(options);
  } catch (error) {
    console.error('Error updating pattern usage:', error);
  }
}

/**
 * Get cached department-specific search options
 * @param {string} userId - User ID
 * @param {string} departmentId - Department ID
 * @returns {Object|null} Department options or null if not cached
 */
async function getCachedSearchOptions(userId, departmentId) {
  const cacheKey = generateSearchCacheKey('search_options', userId, departmentId);
  return await getFromSearchCache(cacheKey);
}

/**
 * Cache department-specific search options
 * @param {string} userId - User ID
 * @param {string} departmentId - Department ID
 * @param {Object} options - Search options
 */
async function cacheSearchOptions(userId, departmentId, options) {
  const cacheKey = generateSearchCacheKey('search_options', userId, departmentId);
  await storeInSearchCache(cacheKey, options, 24); // Cache for 24 hours
}

/**
 * Get cached multi-model quantity search results
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @returns {Array|null} Search results or null if not cached
 */
async function getCachedMultiModelQuantityResults(userId, query) {
  const cacheKey = generateSearchCacheKey('quantity_search', userId, query);
  return await getFromSearchCache(cacheKey);
}

/**
 * Cache multi-model quantity search results
 * @param {string} userId - User ID
 * @param {string} query - Search query
 * @param {Array} results - Search results
 */
async function cacheMultiModelQuantityResults(userId, query, results) {
  const cacheKey = generateSearchCacheKey('quantity_search', userId, query);
  await storeInSearchCache(cacheKey, results, 0.5); // Cache for 30 minutes (short-lived)
}

// Export functions
module.exports = {
  generateSearchCacheKey,
  getFromSearchCache,
  storeInSearchCache,
  cleanupExpiredSearchCache,
  interpretSearchInput,
  getCachedSearchOptions,
  cacheSearchOptions,
  getCachedMultiModelQuantityResults,
  cacheMultiModelQuantityResults
};