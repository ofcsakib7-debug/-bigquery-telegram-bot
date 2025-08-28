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
        MODEL \`${datasetId}.heuristic_pattern_model\`,
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

/**
 * Analyze query patterns for anomaly detection
 * @param {string} userId - User ID
 * @param {string} queryText - User input text
 * @returns {Object} Pattern analysis
 */
async function analyzeQueryPatterns(userId, queryText) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Analyzing query patterns for user ${userId}: "${queryText}"`);
      
      // Get pattern characteristics
      const patternCharacteristics = getPatternCharacteristics(queryText);
      
      // Get user pattern history
      const userPatternHistory = await getUserPatternHistory(userId);
      
      // Compare with historical patterns
      const comparisonResult = compareWithHistoricalPatterns(patternCharacteristics, userPatternHistory);
      
      // Check for anomalies
      const anomalies = detectAnomalies(patternCharacteristics, comparisonResult);
      
      // Generate analysis result
      const analysis = {
        userId: userId.toString(),
        queryText: queryText,
        patternCharacteristics: patternCharacteristics,
        historicalComparison: comparisonResult,
        detectedAnomalies: anomalies,
        timestamp: new Date().toISOString()
      };
      
      return analysis;
    } catch (error) {
      console.error(`Error analyzing query patterns for user ${userId}:`, error);
      return {
        userId: userId.toString(),
        queryText: queryText,
        error: 'Error analyzing query patterns',
        timestamp: new Date().toISOString()
      };
    }
  })();
}

/**
 * Get pattern characteristics
 * @param {string} queryText - User input text
 * @returns {Object} Pattern characteristics
 */
function getPatternCharacteristics(queryText) {
  try {
    return {
      length: queryText.length,
      wordCount: queryText.trim().split(/\s+/).length,
      characterTypes: {
        letters: (queryText.match(/[a-z]/g) || []).length,
        numbers: (queryText.match(/[0-9]/g) || []).length,
        spaces: (queryText.match(/\s/g) || []).length,
        specialChars: (queryText.match(/[^a-z0-9\s]/g) || []).length
      },
      hasVariables: queryText.includes('{') && queryText.includes('}'),
      hasEquals: queryText.includes('='),
      hasMultiModelFormat: /^[a-z0-9]{2,4}=\d{1,2}(\s+[a-z0-9]{2,4}=\d{1,2})*$/.test(queryText.trim()),
      complexity: calculatePatternComplexity(queryText),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting pattern characteristics:', error);
    return {
      length: 0,
      wordCount: 0,
      characterTypes: {
        letters: 0,
        numbers: 0,
        spaces: 0,
        specialChars: 0
      },
      hasVariables: false,
      hasEquals: false,
      hasMultiModelFormat: false,
      complexity: 0,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Calculate pattern complexity
 * @param {string} queryText - User input text
 * @returns {number} Complexity score (0-1)
 */
function calculatePatternComplexity(queryText) {
  try {
    // Base complexity on length, character variety, and structure
    const lengthFactor = Math.min(queryText.length / 20, 1); // Normalize to 0-1
    const varietyFactor = (queryText.match(/[^a-z0-9\s]/g) || []).length > 0 ? 0.3 : 0; // Special chars add complexity
    const structureFactor = queryText.includes('=') ? 0.4 : 0; // Equals adds complexity
    const variableFactor = (queryText.match(/{[^}]+}/g) || []).length * 0.2; // Variables add complexity
    
    const complexity = Math.min(lengthFactor + varietyFactor + structureFactor + variableFactor, 1);
    return Math.max(0, complexity);
  } catch (error) {
    console.error('Error calculating pattern complexity:', error);
    return 0;
  }
}

/**
 * Get user pattern history
 * @param {string} userId - User ID
 * @returns {Array} User pattern history
 */
async function getUserPatternHistory(userId) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('user_pattern_history', userId, 'recent');
    const cachedHistory = await getFromCache(cacheKey);
    
    if (cachedHistory) {
      return cachedHistory;
    }
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Get last 10 patterns from user
    const query = `
      SELECT 
        input_text,
        query_type,
        confidence_score,
        successful_completion,
        timestamp
      FROM \`${datasetId}.search_interactions\`
      WHERE user_id = @user_id
      ORDER BY timestamp DESC
      LIMIT 10
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: { user_id: userId.toString() }
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const history = rows.map(row => ({
      inputText: row.input_text,
      queryType: row.query_type,
      confidenceScore: parseFloat(row.confidence_score),
      successful: row.successful_completion,
      timestamp: row.timestamp.value
    }));
    
    // Cache for 1 hour
    await storeInCache(cacheKey, history, 1);
    
    return history;
  } catch (error) {
    console.error(`Error getting user pattern history for user ${userId}:`, error);
    return [];
  }
}

/**
 * Compare with historical patterns
 * @param {Object} characteristics - Current pattern characteristics
 * @param {Array} history - User pattern history
 * @returns {Object} Comparison result
 */
function compareWithHistoricalPatterns(characteristics, history) {
  try {
    if (history.length === 0) {
      return {
        similarityScore: 0,
        isNewPattern: true,
        commonCharacteristics: [],
        differences: ['No historical patterns to compare']
      };
    }
    
    // Calculate similarity with historical patterns
    const similarities = history.map(historicalPattern => {
      return calculatePatternSimilarity(characteristics, getPatternCharacteristics(historicalPattern.inputText));
    });
    
    const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
    
    // Find common characteristics
    const commonCharacteristics = [];
    const differences = [];
    
    // Check if this is a new pattern type
    const isNewPattern = avgSimilarity < 0.3;
    
    if (isNewPattern) {
      differences.push('This appears to be a new pattern type for this user');
      commonCharacteristics.push('New pattern exploration');
    } else {
      commonCharacteristics.push('Similar to previous patterns');
    }
    
    return {
      similarityScore: avgSimilarity,
      isNewPattern: isNewPattern,
      commonCharacteristics: commonCharacteristics,
      differences: differences
    };
  } catch (error) {
    console.error('Error comparing with historical patterns:', error);
    return {
      similarityScore: 0,
      isNewPattern: true,
      commonCharacteristics: [],
      differences: ['Error comparing with historical patterns']
    };
  }
}

/**
 * Calculate pattern similarity
 * @param {Object} char1 - Pattern characteristics 1
 * @param {Object} char2 - Pattern characteristics 2
 * @returns {number} Similarity score (0-1)
 */
function calculatePatternSimilarity(char1, char2) {
  try {
    // Simple Euclidean distance similarity
    const diffLength = Math.abs(char1.length - char2.length) / Math.max(char1.length, char2.length);
    const diffWordCount = Math.abs(char1.wordCount - char2.wordCount) / Math.max(char1.wordCount, char2.wordCount);
    const diffLetters = Math.abs(char1.characterTypes.letters - char2.characterTypes.letters) / Math.max(char1.characterTypes.letters, char2.characterTypes.letters);
    const diffNumbers = Math.abs(char1.characterTypes.numbers - char2.characterTypes.numbers) / Math.max(char1.characterTypes.numbers, char2.characterTypes.numbers);
    
    const similarity = 1 - (diffLength + diffWordCount + diffLetters + diffNumbers) / 4;
    return Math.max(0, Math.min(1, similarity));
  } catch (error) {
    console.error('Error calculating pattern similarity:', error);
    return 0;
  }
}

/**
 * Detect anomalies in pattern characteristics
 * @param {Object} characteristics - Pattern characteristics
 * @param {Object} comparison - Historical comparison
 * @returns {Array} Detected anomalies
 */
function detectAnomalies(characteristics, comparison) {
  try {
    const anomalies = [];
    
    // Check for unusually long patterns
    if (characteristics.length > 20) {
      anomalies.push({
        type: 'LENGTH_ANOMALY',
        severity: 'MEDIUM',
        description: `Pattern is unusually long (${characteristics.length} characters)`,
        recommendation: 'Consider using a shorter, more specific pattern'
      });
    }
    
    // Check for unusually complex patterns
    if (characteristics.complexity > 0.8) {
      anomalies.push({
        type: 'COMPLEXITY_ANOMALY',
        severity: 'MEDIUM',
        description: `Pattern is unusually complex (complexity: ${characteristics.complexity.toFixed(2)})`,
        recommendation: 'Consider simplifying the pattern or breaking it into smaller parts'
      });
    }
    
    // Check for new pattern types
    if (comparison.isNewPattern) {
      anomalies.push({
        type: 'NEW_PATTERN_ANOMALY',
        severity: 'LOW',
        description: 'This appears to be a new pattern type for this user',
        recommendation: 'Pattern learning system will adapt to this new pattern'
      });
    }
    
    // Check for missing elements in multi-model format
    if (characteristics.hasMultiModelFormat) {
      const modelParts = characteristics.hasMultiModelFormat.split(/\s+/);
      if (modelParts.length === 1) {
        anomalies.push({
          type: 'SINGLE_MODEL_ANOMALY',
          severity: 'LOW',
          description: 'Multi-model format detected but only one model specified',
          recommendation: 'Consider if this should be a single model query or add more models'
        });
      }
    }
    
    return anomalies;
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return [];
  }
}

// Export functions
module.exports = {
  checkHeuristicPatterns,
  predictWithBqmlModel,
  getUserContext,
  generateHeuristicSuggestions,
  analyzeQueryPatterns,
  getPatternCharacteristics,
  calculatePatternComplexity,
  getUserPatternHistory,
  compareWithHistoricalPatterns,
  calculatePatternSimilarity,
  detectAnomalies
};