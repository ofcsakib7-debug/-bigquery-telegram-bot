// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 3
// Component: validation_layer_3_heuristic
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 15:30 UTC
// Next Step: Implement typo correction system
// =============================================

const { BigQuery } = require('@google-cloud/bigquery');
const { getFromCache, storeInCache, generateCacheKey } = require('../bigquery/cache');
const { withErrorHandling } = require('./error_handling');

// Lazy initialization of BigQuery client
let bigquery = null;
function getBigQuery() {
  if (!bigquery) {
    bigquery = new BigQuery();
  }
  return bigquery;
}

/**
 * Layer 3: Heuristic Pattern Check
 * Performs BQML-powered pattern analysis with 0 quota cost (cached)
 * @param {string} userId - User ID
 * @param {string} queryText - User input text
 * @returns {Object} Heuristic analysis result
 */
async function checkHeuristicPatterns(userId, queryText) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Checking heuristic patterns for user ${userId}: "${queryText}"`);
      
      // Validate inputs
      if (!userId || !queryText) {
        return {
          suspicious: false,
          confidenceScore: 0.0,
          error: 'Invalid inputs'
        };
      }
      
      // Check cache first for instant response
      const cacheKey = generateCacheKey('heuristic_check', userId, queryText);
      const cachedResult = await getFromCache(cacheKey);
      
      if (cachedResult) {
        console.log(`Returning cached heuristic result for user ${userId}`);
        return cachedResult;
      }
      
      // If cache miss, use BQML model for prediction
      const prediction = await predictWithBqmlModel(userId, queryText);
      
      // Prepare result
      const result = {
        suspicious: prediction.suspicionScore > 0.3,
        confidenceScore: prediction.confidenceScore,
        suspicionScore: prediction.suspicionScore,
        recommendations: prediction.recommendations || []
      };
      
      // Cache the prediction for future use (1 hour)
      await storeInCache(cacheKey, result, 1);
      
      return result;
    } catch (error) {
      console.error(`Error checking heuristic patterns for user ${userId}:`, error);
      return {
        suspicious: false,
        confidenceScore: 0.0,
        suspicionScore: 0.0,
        error: 'Error checking heuristic patterns'
      };
    }
  })();
}

/**
 * Predict with BQML model for heuristic analysis
 * @param {string} userId - User ID
 * @param {string} queryText - User input text
 * @returns {Object} Prediction results
 */
async function predictWithBqmlModel(userId, queryText) {
  try {
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Get user context
    const userContext = await getUserContext(userId);
    
    // Prepare prediction query
    const query = `
      SELECT 
        suspicion_score,
        confidence_score,
        recommended_action
      FROM ML.PREDICT(
        MODEL \`${datasetId}.heuristic_model\`,
        STRUCT(
          @query_text AS input_text,
          @user_id AS user_id,
          @department_id AS department_id,
          @hour_of_day AS hour_of_day,
          @day_of_week AS day_of_week,
          @recent_patterns AS recent_patterns
        )
      )
      LIMIT 1
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: {
        query_text: queryText,
        user_id: userId.toString(),
        department_id: userContext.departmentId || 'GENERAL',
        hour_of_day: new Date().getHours().toString().padStart(2, '0'),
        day_of_week: new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase(),
        recent_patterns: userContext.recentPatterns || []
      }
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    if (rows.length > 0) {
      return {
        suspicionScore: parseFloat(rows[0].suspicion_score) || 0.0,
        confidenceScore: parseFloat(rows[0].confidence_score) || 0.5,
        recommendations: rows[0].recommended_action ? [rows[0].recommended_action] : []
      };
    }
    
    // Default values if no prediction
    return {
      suspicionScore: 0.0,
      confidenceScore: 0.5,
      recommendations: []
    };
  } catch (error) {
    console.error(`Error predicting with BQML model for user ${userId}:`, error);
    return {
      suspicionScore: 0.0,
      confidenceScore: 0.5,
      recommendations: [],
      error: 'Error in BQML prediction'
    };
  }
}

/**
 * Get user context for heuristic analysis
 * @param {string} userId - User ID
 * @returns {Object} User context
 */
async function getUserContext(userId) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('user_context', userId, 'current');
    const cachedContext = await getFromCache(cacheKey);
    
    if (cachedContext) {
      return cachedContext;
    }
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Get user department
    const departmentQuery = `
      SELECT department_id
      FROM \`${datasetId}.user_profiles\`
      WHERE user_id = @user_id
      LIMIT 1
    `;
    
    const departmentOptions = {
      query: departmentQuery,
      location: 'us-central1',
      params: { user_id: userId.toString() }
    };
    
    const [departmentRows] = await bigqueryClient.query(departmentOptions);
    const departmentId = departmentRows.length > 0 ? departmentRows[0].department_id : 'GENERAL';
    
    // Get recent patterns (last 3)
    const recentPatternsQuery = `
      SELECT input_text
      FROM \`${datasetId}.search_interactions\`
      WHERE user_id = @user_id
      ORDER BY timestamp DESC
      LIMIT 3
    `;
    
    const recentPatternsOptions = {
      query: recentPatternsQuery,
      location: 'us-central1',
      params: { user_id: userId.toString() }
    };
    
    const [recentPatternRows] = await bigqueryClient.query(recentPatternsOptions);
    const recentPatterns = recentPatternRows.map(row => row.input_text);
    
    const context = {
      userId: userId.toString(),
      departmentId: departmentId,
      recentPatterns: recentPatterns,
      timestamp: new Date().toISOString()
    };
    
    // Cache for 30 minutes
    await storeInCache(cacheKey, context, 0.5);
    
    return context;
  } catch (error) {
    console.error(`Error getting user context for user ${userId}:`, error);
    return {
      userId: userId.toString(),
      departmentId: 'GENERAL',
      recentPatterns: [],
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Generate heuristic validation suggestions
 * @param {Object} heuristicResult - Heuristic analysis result
 * @param {string} userId - User ID
 * @param {string} queryText - User input text
 * @returns {Array} Validation suggestions
 */
function generateHeuristicSuggestions(heuristicResult, userId, queryText) {
  try {
    const suggestions = [];
    
    // Add recommendations from BQML model
    if (heuristicResult.recommendations && heuristicResult.recommendations.length > 0) {
      suggestions.push(...heuristicResult.recommendations);
    }
    
    // Add generic suggestions based on suspicion score
    if (heuristicResult.suspicionScore > 0.7) {
      suggestions.push('This query looks unusual. Double-check your input.');
      suggestions.push('Consider using a different pattern or format.');
    } else if (heuristicResult.suspicionScore > 0.5) {
      suggestions.push('This query might need refinement.');
      suggestions.push('Try a similar pattern if this is not what you intended.');
    } else if (heuristicResult.suspicionScore > 0.3) {
      suggestions.push('This query is slightly unusual but might be correct.');
      suggestions.push('Proceed with caution or try an alternative pattern.');
    }
    
    // Add confidence-based suggestions
    if (heuristicResult.confidenceScore < 0.3) {
      suggestions.push('Low confidence in this query interpretation.');
      suggestions.push('Consider rephrasing or using a clearer pattern.');
    } else if (heuristicResult.confidenceScore < 0.6) {
      suggestions.push('Moderate confidence in this query interpretation.');
      suggestions.push('Double-check the results after processing.');
    }
    
    return suggestions;
  } catch (error) {
    console.error(`Error generating heuristic suggestions for user ${userId}:`, error);
    return [];
  }
}

// Export functions
module.exports = {
  checkHeuristicPatterns,
  predictWithBqmlModel,
  getUserContext,
  generateHeuristicSuggestions
};