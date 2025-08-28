// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 3
// Component: common_corrections_cache
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 16:45 UTC
// Next Step: Implement search processing flow
// =============================================

const { BigQuery } = require('@google-cloud/bigquery');
const { Firestore } = require('@google-cloud/firestore');
const { getFromCache, storeInCache, generateCacheKey } = require('../bigquery/cache');
const { withErrorHandling } = require('./error_handling');

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
 * Common Corrections Cache System
 * Implements caching for frequently used typo corrections with usage tracking
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.commonCorrectionsCache = async (req, res) => {
  try {
    console.log('Managing common corrections cache...');
    
    const bigqueryClient = getBigQuery();
    const firestoreClient = getFirestore();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Get cache management parameters
    const { action, departmentId, limit } = req.query;
    
    switch (action) {
      case 'rebuild':
        await rebuildCommonCorrectionsCache(bigqueryClient, datasetId, departmentId);
        res.status(200).send('Common corrections cache rebuilt successfully');
        break;
      case 'cleanup':
        await cleanupCommonCorrectionsCache(bigqueryClient, datasetId);
        res.status(200).send('Common corrections cache cleaned up successfully');
        break;
      case 'optimize':
        await optimizeCommonCorrectionsCache(bigqueryClient, datasetId);
        res.status(200).send('Common corrections cache optimized successfully');
        break;
      case 'stats':
        const stats = await getCommonCorrectionsCacheStats(bigqueryClient, datasetId, departmentId, limit);
        res.status(200).json(stats);
        break;
      default:
        res.status(400).send('Invalid action parameter');
    }
  } catch (error) {
    console.error('Error managing common corrections cache:', error);
    res.status(500).send('Error managing common corrections cache');
  }
};

/**
 * Rebuild common corrections cache
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @param {string} departmentId - Department ID (optional)
 */
async function rebuildCommonCorrectionsCache(bigqueryClient, datasetId, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Rebuilding common corrections cache for department: ${departmentId || 'ALL'}`);
      
      // Check cache first
      const cacheKey = generateCacheKey('cache', 'corrections_rebuild', departmentId || 'all');
      const cachedRebuild = await getFromCache(cacheKey);
      
      if (cachedRebuild) {
        console.log(`Common corrections cache already rebuilt for ${departmentId || 'ALL'} recently`);
        return;
      }
      
      // Build WHERE clause for department filter
      let whereClause = '';
      const params = {};
      
      if (departmentId) {
        whereClause = 'WHERE department_id = @departmentId';
        params.departmentId = departmentId.toString();
      }
      
      // Rebuild common corrections cache with recent high-confidence corrections
      const query = `
        CREATE OR REPLACE TABLE \`${datasetId}.common_corrections\` AS
        WITH correction_stats AS (
          SELECT
            department_id,
            original_text,
            corrected_text,
            COUNT(*) as usage_count,
            AVG(confidence_score) as avg_confidence,
            MIN(timestamp) as first_used,
            MAX(timestamp) as last_used,
            COUNT(DISTINCT user_id) as unique_users
          FROM \`${datasetId}.correction_history\`
          ${whereClause}
          AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
          GROUP BY department_id, original_text, corrected_text
          HAVING 
            usage_count >= 2  // Used at least twice
            AND avg_confidence >= 0.4  // Decent confidence
        )
        SELECT
          CONCAT('CORR-', FORMAT_TIMESTAMP('%Y%m%d', CURRENT_TIMESTAMP()), '-', 
                 UPPER(RAND())) as correction_id,
          department_id,
          original_text,
          corrected_text,
          LEAST(20, GREATEST(1, 
               CAST(ROUND(LENGTH(original_text) * 0.3 + 
                     ABS(LENGTH(original_text) - LENGTH(corrected_text)) * 0.7) AS INT64))) 
               as levenshtein_distance,  // Approximate levenshtein distance
          usage_count,
          last_used,
          avg_confidence as confidence_score,
          CURRENT_TIMESTAMP() as created_at,
          'SYSTEM' as created_by,
          unique_users
        FROM correction_stats
        WHERE 
          LENGTH(original_text) >= 2  // Minimum 2 characters
          AND LENGTH(original_text) <= 20  // Maximum 20 characters
          AND LENGTH(corrected_text) >= 2
          AND LENGTH(corrected_text) <= 20
        ORDER BY usage_count DESC, avg_confidence DESC, last_used DESC
        LIMIT 10000;
      `;
      
      const options = {
        query: query,
        location: 'us-central1',
        params: params
      };
      
      await bigqueryClient.query(options);
      
      console.log(`Common corrections cache rebuilt for ${departmentId || 'ALL'} successfully`);
      
      // Cache for 6 hours
      await storeInCache(cacheKey, { status: 'rebuilt' }, 6);
      
    } catch (error) {
      console.error(`Error rebuilding common corrections cache for ${departmentId || 'ALL'}:`, error);
      throw error;
    }
  })();
}

/**
 * Cleanup common corrections cache
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 */
async function cleanupCommonCorrectionsCache(bigqueryClient, datasetId) {
  return await withErrorHandling(async () => {
    try {
      console.log('Cleaning up common corrections cache...');
      
      // Check cache first
      const cacheKey = generateCacheKey('cache', 'corrections_cleanup', 'current');
      const cachedCleanup = await getFromCache(cacheKey);
      
      if (cachedCleanup) {
        console.log('Common corrections cache already cleaned up recently');
        return;
      }
      
      // Remove low-confidence and low-usage corrections
      const query = `
        DELETE FROM \`${datasetId}.common_corrections\`
        WHERE 
          confidence_score < 0.3  // Remove low confidence corrections
          OR usage_count < 2       // Remove rarely used corrections
          OR DATE(created_at) < DATE_SUB(CURRENT_DATE(), INTERVAL 180 DAY);  // Remove old corrections
      `;
      
      const options = {
        query: query,
        location: 'us-central1'
      };
      
      await bigqueryClient.query(options);
      
      console.log('Common corrections cache cleaned up successfully');
      
      // Cache for 12 hours
      await storeInCache(cacheKey, { status: 'cleaned' }, 12);
      
    } catch (error) {
      console.error('Error cleaning up common corrections cache:', error);
      throw error;
    }
  })();
}

/**
 * Optimize common corrections cache
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 */
async function optimizeCommonCorrectionsCache(bigqueryClient, datasetId) {
  return await withErrorHandling(async () => {
    try {
      console.log('Optimizing common corrections cache...');
      
      // Check cache first
      const cacheKey = generateCacheKey('cache', 'corrections_optimization', 'current');
      const cachedOptimization = await getFromCache(cacheKey);
      
      if (cachedOptimization) {
        console.log('Common corrections cache already optimized recently');
        return;
      }
      
      // Update usage counts and confidence scores based on recent activity
      const query = `
        UPDATE \`${datasetId}.common_corrections\` cc
        SET
          usage_count = (
            SELECT COUNT(*)
            FROM \`${datasetId}.correction_history\` ch
            WHERE 
              ch.department_id = cc.department_id
              AND ch.original_text = cc.original_text
              AND ch.corrected_text = cc.corrected_text
              AND DATE(ch.timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
          ),
          last_used = (
            SELECT MAX(timestamp)
            FROM \`${datasetId}.correction_history\` ch
            WHERE 
              ch.department_id = cc.department_id
              AND ch.original_text = cc.original_text
              AND ch.corrected_text = cc.corrected_text
              AND DATE(ch.timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
          ),
          confidence_score = (
            SELECT AVG(confidence_score)
            FROM \`${datasetId}.correction_history\` ch
            WHERE 
              ch.department_id = cc.department_id
              AND ch.original_text = cc.original_text
              AND ch.corrected_text = cc.corrected_text
              AND DATE(ch.timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
          ),
          updated_at = CURRENT_TIMESTAMP()
        WHERE DATE(cc.created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 180 DAY);
      `;
      
      const options = {
        query: query,
        location: 'us-central1'
      };
      
      await bigqueryClient.query(options);
      
      console.log('Common corrections cache optimized successfully');
      
      // Cache for 24 hours
      await storeInCache(cacheKey, { status: 'optimized' }, 24);
      
    } catch (error) {
      console.error('Error optimizing common corrections cache:', error);
      throw error;
    }
  })();
}

/**
 * Get common corrections cache statistics
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @param {string} departmentId - Department ID (optional)
 * @param {number} limit - Limit for results (optional)
 * @returns {Object} Cache statistics
 */
async function getCommonCorrectionsCacheStats(bigqueryClient, datasetId, departmentId, limit = 100) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Getting common corrections cache stats for department: ${departmentId || 'ALL'}`);
      
      // Check cache first
      const cacheKey = generateCacheKey('cache', 'corrections_stats', `${departmentId || 'all'}:${limit}`);
      const cachedStats = await getFromCache(cacheKey);
      
      if (cachedStats) {
        console.log(`Using cached common corrections cache stats for ${departmentId || 'ALL'}`);
        return cachedStats;
      }
      
      // Build WHERE clause for department filter
      let whereClause = '';
      const params = { limit: parseInt(limit) || 100 };
      
      if (departmentId) {
        whereClause = 'WHERE department_id = @departmentId';
        params.departmentId = departmentId.toString();
      }
      
      // Get cache statistics
      const query = `
        SELECT
          COUNT(*) as total_corrections,
          COUNT(DISTINCT department_id) as departments_covered,
          AVG(usage_count) as avg_usage_count,
          AVG(confidence_score) as avg_confidence_score,
          AVG(levenshtein_distance) as avg_levenshtein_distance,
          MIN(created_at) as earliest_correction,
          MAX(created_at) as latest_correction,
          COUNTIF(confidence_score >= 0.8) as high_confidence_corrections,
          COUNTIF(confidence_score >= 0.5 AND confidence_score < 0.8) as medium_confidence_corrections,
          COUNTIF(confidence_score < 0.5) as low_confidence_corrections,
          COUNTIF(usage_count >= 10) as frequently_used_corrections,
          COUNTIF(usage_count >= 5 AND usage_count < 10) as moderately_used_corrections,
          COUNTIF(usage_count < 5) as rarely_used_corrections
        FROM \`${datasetId}.common_corrections\`
        ${whereClause}
      `;
      
      const options = {
        query: query,
        location: 'us-central1',
        params: params
      };
      
      const [rows] = await bigqueryClient.query(options);
      
      const stats = rows.length > 0 ? {
        total_corrections: parseInt(rows[0].total_corrections) || 0,
        departments_covered: parseInt(rows[0].departments_covered) || 0,
        avg_usage_count: parseFloat(rows[0].avg_usage_count) || 0,
        avg_confidence_score: parseFloat(rows[0].avg_confidence_score) || 0,
        avg_levenshtein_distance: parseFloat(rows[0].avg_levenshtein_distance) || 0,
        earliest_correction: rows[0].earliest_correction ? rows[0].earliest_correction.value : null,
        latest_correction: rows[0].latest_correction ? rows[0].latest_correction.value : null,
        high_confidence_corrections: parseInt(rows[0].high_confidence_corrections) || 0,
        medium_confidence_corrections: parseInt(rows[0].medium_confidence_corrections) || 0,
        low_confidence_corrections: parseInt(rows[0].low_confidence_corrections) || 0,
        frequently_used_corrections: parseInt(rows[0].frequently_used_corrections) || 0,
        moderately_used_corrections: parseInt(rows[0].moderately_used_corrections) || 0,
        rarely_used_corrections: parseInt(rows[0].rarely_used_corrections) || 0,
        confidence_breakdown: {
          high: parseInt(rows[0].high_confidence_corrections) || 0,
          medium: parseInt(rows[0].medium_confidence_corrections) || 0,
          low: parseInt(rows[0].low_confidence_corrections) || 0
        },
        usage_breakdown: {
          frequent: parseInt(rows[0].frequently_used_corrections) || 0,
          moderate: parseInt(rows[0].moderately_used_corrections) || 0,
          rare: parseInt(rows[0].rarely_used_corrections) || 0
        },
        period_days: 90
      } : {
        total_corrections: 0,
        departments_covered: 0,
        avg_usage_count: 0,
        avg_confidence_score: 0,
        avg_levenshtein_distance: 0,
        earliest_correction: null,
        latest_correction: null,
        high_confidence_corrections: 0,
        medium_confidence_corrections: 0,
        low_confidence_corrections: 0,
        frequently_used_corrections: 0,
        moderately_used_corrections: 0,
        rarely_used_corrections: 0,
        confidence_breakdown: {
          high: 0,
          medium: 0,
          low: 0
        },
        usage_breakdown: {
          frequent: 0,
          moderate: 0,
          rare: 0
        },
        period_days: 90
      };
      
      // Cache for 2 hours
      await storeInCache(cacheKey, stats, 2);
      
      return stats;
    } catch (error) {
      console.error(`Error getting common corrections cache stats for ${departmentId || 'ALL'}:`, error);
      return {
        total_corrections: 0,
        departments_covered: 0,
        avg_usage_count: 0,
        avg_confidence_score: 0,
        avg_levenshtein_distance: 0,
        earliest_correction: null,
        latest_correction: null,
        high_confidence_corrections: 0,
        medium_confidence_corrections: 0,
        low_confidence_corrections: 0,
        frequently_used_corrections: 0,
        moderately_used_corrections: 0,
        rarely_used_corrections: 0,
        confidence_breakdown: {
          high: 0,
          medium: 0,
          low: 0
        },
        usage_breakdown: {
          frequent: 0,
          moderate: 0,
          rare: 0
        },
        period_days: 90
      };
    }
  })();
}

/**
 * Get top common corrections for a department
 * @param {string} departmentId - Department ID
 * @param {number} limit - Limit for results (default: 50)
 * @returns {Array} Top common corrections
 */
async function getTopCommonCorrections(departmentId, limit = 50) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Getting top common corrections for department: ${departmentId}`);
      
      // Check cache first
      const cacheKey = generateCacheKey('cache', 'top_corrections', `${departmentId}:${limit}`);
      const cachedCorrections = await getFromCache(cacheKey);
      
      if (cachedCorrections) {
        console.log(`Using cached top common corrections for ${departmentId}`);
        return cachedCorrections;
      }
      
      const bigqueryClient = getBigQuery();
      const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
      
      const query = `
        SELECT
          correction_id,
          department_id,
          original_text,
          corrected_text,
          levenshtein_distance,
          usage_count,
          last_used,
          confidence_score,
          created_at
        FROM \`${datasetId}.common_corrections\`
        WHERE 
          department_id = @departmentId
          AND confidence_score >= 0.4
        ORDER BY usage_count DESC, confidence_score DESC, last_used DESC
        LIMIT @limit
      `;
      
      const options = {
        query: query,
        location: 'us-central1',
        params: {
          departmentId: departmentId.toString(),
          limit: parseInt(limit) || 50
        }
      };
      
      const [rows] = await bigqueryClient.query(options);
      
      const corrections = rows.map(row => ({
        correction_id: row.correction_id,
        department_id: row.department_id,
        original_text: row.original_text,
        corrected_text: row.corrected_text,
        levenshtein_distance: parseInt(row.levenshtein_distance) || 0,
        usage_count: parseInt(row.usage_count) || 0,
        last_used: row.last_used ? row.last_used.value : null,
        confidence_score: parseFloat(row.confidence_score) || 0,
        created_at: row.created_at ? row.created_at.value : null
      }));
      
      // Cache for 4 hours
      await storeInCache(cacheKey, corrections, 4);
      
      return corrections;
    } catch (error) {
      console.error(`Error getting top common corrections for ${departmentId}:`, error);
      return [];
    }
  })();
}

/**
 * Get common corrections for a specific original text
 * @param {string} originalText - Original text
 * @param {string} departmentId - Department ID
 * @returns {Array} Common corrections
 */
async function getCommonCorrectionsForText(originalText, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Getting common corrections for text: "${originalText}" in department: ${departmentId}`);
      
      // Check cache first
      const cacheKey = generateCacheKey('cache', 'corrections_for_text', `${departmentId}:${originalText}`);
      const cachedCorrections = await getFromCache(cacheKey);
      
      if (cachedCorrections) {
        console.log(`Using cached common corrections for text: "${originalText}"`);
        return cachedCorrections;
      }
      
      const bigqueryClient = getBigQuery();
      const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
      
      const query = `
        SELECT
          correction_id,
          department_id,
          original_text,
          corrected_text,
          levenshtein_distance,
          usage_count,
          last_used,
          confidence_score,
          created_at
        FROM \`${datasetId}.common_corrections\`
        WHERE 
          department_id = @departmentId
          AND original_text = @originalText
          AND confidence_score >= 0.4
        ORDER BY usage_count DESC, confidence_score DESC
        LIMIT 5
      `;
      
      const options = {
        query: query,
        location: 'us-central1',
        params: {
          departmentId: departmentId.toString(),
          originalText: originalText.trim()
        }
      };
      
      const [rows] = await bigqueryClient.query(options);
      
      const corrections = rows.map(row => ({
        correction_id: row.correction_id,
        department_id: row.department_id,
        original_text: row.original_text,
        corrected_text: row.corrected_text,
        levenshtein_distance: parseInt(row.levenshtein_distance) || 0,
        usage_count: parseInt(row.usage_count) || 0,
        last_used: row.last_used ? row.last_used.value : null,
        confidence_score: parseFloat(row.confidence_score) || 0,
        created_at: row.created_at ? row.created_at.value : null
      }));
      
      // Cache for 2 hours
      await storeInCache(cacheKey, corrections, 2);
      
      return corrections;
    } catch (error) {
      console.error(`Error getting common corrections for text "${originalText}" in ${departmentId}:`, error);
      return [];
    }
  })();
}

/**
 * Add new correction to common corrections cache
 * @param {string} originalText - Original text
 * @param {string} correctedText - Corrected text
 * @param {string} departmentId - Department ID
 * @param {number} confidenceScore - Confidence score (0.0-1.0)
 * @param {string} userId - User ID
 */
async function addNewCorrectionToCache(originalText, correctedText, departmentId, confidenceScore, userId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Adding new correction to cache: "${originalText}" -> "${correctedText}" for department: ${departmentId}`);
      
      const bigqueryClient = getBigQuery();
      const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
      
      // Generate correction ID
      const correctionId = `CORR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
      
      // Calculate approximate levenshtein distance
      const levenshteinDistance = calculateApproximateLevenshteinDistance(originalText, correctedText);
      
      const query = `
        INSERT INTO \`${datasetId}.common_corrections\`
        (correction_id, department_id, original_text, corrected_text, levenshtein_distance, usage_count, last_used, confidence_score, created_at, created_by)
        VALUES
        (@correctionId, @departmentId, @originalText, @correctedText, @levenshteinDistance, 1, CURRENT_TIMESTAMP(), @confidenceScore, CURRENT_TIMESTAMP(), @userId)
      `;
      
      const options = {
        query: query,
        location: 'us-central1',
        params: {
          correctionId: correctionId,
          departmentId: departmentId.toString(),
          originalText: originalText.trim(),
          correctedText: correctedText.trim(),
          levenshteinDistance: levenshteinDistance,
          confidenceScore: parseFloat(confidenceScore) || 0.5,
          userId: userId.toString()
        }
      };
      
      await bigqueryClient.query(options);
      
      console.log(`New correction added to cache: ${correctionId} - "${originalText}" -> "${correctedText}"`);
      
      // Invalidate cache for this text and department
      const cacheKey1 = generateCacheKey('cache', 'corrections_for_text', `${departmentId}:${originalText}`);
      const cacheKey2 = generateCacheKey('cache', 'top_corrections', `${departmentId}:50`);
      await storeInCache(cacheKey1, null, 0); // Invalidate
      await storeInCache(cacheKey2, null, 0); // Invalidate
      
    } catch (error) {
      console.error(`Error adding new correction to cache for ${departmentId}:`, error);
      throw error;
    }
  })();
}

/**
 * Calculate approximate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Approximate Levenshtein distance
 */
function calculateApproximateLevenshteinDistance(str1, str2) {
  try {
    // Simple approximation based on string length and character differences
    const len1 = str1.length;
    const len2 = str2.length;
    
    // Base distance on length difference
    const lengthDifference = Math.abs(len1 - len2);
    
    // Count character differences
    const commonChars = countCommonCharacters(str1, str2);
    const totalChars = Math.max(len1, len2);
    const charDifference = totalChars - commonChars;
    
    // Calculate approximate distance
    const approxDistance = Math.round((lengthDifference * 0.3 + charDifference * 0.7) * 10) / 10;
    
    // Ensure distance is between 1 and 20
    return Math.max(1, Math.min(20, Math.round(approxDistance)));
  } catch (error) {
    console.error('Error calculating approximate Levenshtein distance:', error);
    return str1.length + str2.length; // Worst case scenario
  }
}

/**
 * Count common characters between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Count of common characters
 */
function countCommonCharacters(str1, str2) {
  try {
    const set1 = new Set(str1.toLowerCase().split(''));
    const set2 = new Set(str2.toLowerCase().split(''));
    
    let commonCount = 0;
    for (const char of set1) {
      if (set2.has(char)) {
        commonCount++;
      }
    }
    
    return commonCount;
  } catch (error) {
    console.error('Error counting common characters:', error);
    return 0;
  }
}

/**
 * Update correction usage count
 * @param {string} originalText - Original text
 * @param {string} correctedText - Corrected text
 * @param {string} departmentId - Department ID
 */
async function updateCorrectionUsageCount(originalText, correctedText, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Updating usage count for correction: "${originalText}" -> "${correctedText}"`);
      
      const bigqueryClient = getBigQuery();
      const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
      
      const query = `
        UPDATE \`${datasetId}.common_corrections\`
        SET 
          usage_count = usage_count + 1,
          last_used = CURRENT_TIMESTAMP(),
          updated_at = CURRENT_TIMESTAMP()
        WHERE 
          department_id = @departmentId
          AND original_text = @originalText
          AND corrected_text = @correctedText
      `;
      
      const options = {
        query: query,
        location: 'us-central1',
        params: {
          departmentId: departmentId.toString(),
          originalText: originalText.trim(),
          correctedText: correctedText.trim()
        }
      };
      
      await bigqueryClient.query(options);
      
      console.log(`Usage count updated for correction: "${originalText}" -> "${correctedText}"`);
      
      // Invalidate cache for this text and department
      const cacheKey = generateCacheKey('cache', 'corrections_for_text', `${departmentId}:${originalText}`);
      await storeInCache(cacheKey, null, 0); // Invalidate
      
    } catch (error) {
      console.error(`Error updating correction usage count for ${departmentId}:`, error);
    }
  })();
}

// Export functions
module.exports = {
  commonCorrectionsCache,
  rebuildCommonCorrectionsCache,
  cleanupCommonCorrectionsCache,
  optimizeCommonCorrectionsCache,
  getCommonCorrectionsCacheStats,
  getTopCommonCorrections,
  getCommonCorrectionsForText,
  addNewCorrectionToCache,
  calculateApproximateLevenshteinDistance,
  countCommonCharacters,
  updateCorrectionUsageCount
};