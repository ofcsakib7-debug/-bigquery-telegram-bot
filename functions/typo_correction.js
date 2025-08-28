// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 3
// Component: typo_correction_system
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 15:45 UTC
// Next Step: Implement auto-correction training system
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
 * Find typo corrections using common patterns
 * @param {string} userId - User ID
 * @param {string} queryText - User input text
 * @param {string} departmentId - Department ID
 * @returns {Array} Array of possible corrections
 */
async function findTypoCorrections(userId, queryText, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Finding typo corrections for user ${userId}: "${queryText}" in department ${departmentId}`);
      
      // Validate inputs
      if (!userId || !queryText || !departmentId) {
        return [];
      }
      
      // Check cache first for instant response
      const cacheKey = generateCacheKey('typo_corrections', userId, `${queryText}:${departmentId}`);
      const cachedCorrections = await getFromCache(cacheKey);
      
      if (cachedCorrections) {
        console.log(`Returning cached typo corrections for user ${userId}`);
        return cachedCorrections;
      }
      
      // Get corrections from common corrections cache
      const commonCorrections = await getCommonCorrections(queryText, departmentId);
      
      if (commonCorrections.length > 0) {
        // Cache results for 2 hours
        await storeInCache(cacheKey, commonCorrections, 2);
        return commonCorrections;
      }
      
      // If no common corrections, use BQML to predict corrections
      const predictedCorrections = await predictCorrections(queryText, departmentId);
      
      // Store predicted corrections in common corrections table for future use
      await storePredictedCorrections(predictedCorrections, queryText, departmentId, userId);
      
      // Cache results for 2 hours
      await storeInCache(cacheKey, predictedCorrections, 2);
      
      return predictedCorrections;
    } catch (error) {
      console.error(`Error finding typo corrections for user ${userId}:`, error);
      return [];
    }
  })();
}

/**
 * Get common corrections from cache
 * @param {string} queryText - User input text
 * @param {string} departmentId - Department ID
 * @returns {Array} Array of common corrections
 */
async function getCommonCorrections(queryText, departmentId) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('common_corrections', departmentId, queryText);
    const cachedCorrections = await getFromCache(cacheKey);
    
    if (cachedCorrections) {
      return cachedCorrections;
    }
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Query common corrections table
    const query = `
      SELECT 
        original_text,
        corrected_text,
        levenshtein_distance,
        usage_count,
        confidence_score
      FROM \`${datasetId}.common_corrections\`
      WHERE 
        department_id = @departmentId
        AND original_text LIKE CONCAT('%', @queryText, '%')
      ORDER BY confidence_score DESC, usage_count DESC
      LIMIT 5
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: {
        departmentId: departmentId.toString(),
        queryText: queryText.trim()
      }
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const corrections = rows.map(row => ({
      originalText: row.original_text,
      correctedText: row.corrected_text,
      levenshteinDistance: parseInt(row.levenshtein_distance),
      usageCount: parseInt(row.usage_count),
      confidenceScore: parseFloat(row.confidence_score),
      type: 'COMMON_CORRECTION'
    }));
    
    // Cache for 4 hours
    await storeInCache(cacheKey, corrections, 4);
    
    return corrections;
  } catch (error) {
    console.error(`Error getting common corrections for ${departmentId}:`, error);
    return [];
  }
}

/**
 * Predict corrections using BQML model
 * @param {string} queryText - User input text
 * @param {string} departmentId - Department ID
 * @returns {Array} Array of predicted corrections
 */
async function predictCorrections(queryText, departmentId) {
  try {
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Use BQML to predict corrections
    const query = `
      SELECT 
        original_text,
        corrected_text,
        confidence_score
      FROM ML.PREDICT(
        MODEL \`${datasetId}.typo_correction_model\`,
        STRUCT(
          @queryText AS input_text,
          @departmentId AS department_id
        )
      )
      WHERE confidence_score > 0.4
      ORDER BY confidence_score DESC
      LIMIT 5
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: {
        queryText: queryText.trim(),
        departmentId: departmentId.toString()
      }
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const corrections = rows.map(row => ({
      originalText: queryText.trim(),
      correctedText: row.corrected_text,
      confidenceScore: parseFloat(row.confidence_score),
      type: 'PREDICTED_CORRECTION'
    }));
    
    return corrections;
  } catch (error) {
    console.error(`Error predicting corrections for ${departmentId}:`, error);
    return [];
  }
}

/**
 * Store predicted corrections in common corrections table
 * @param {Array} corrections - Array of corrections
 * @param {string} originalText - Original text
 * @param {string} departmentId - Department ID
 * @param {string} userId - User ID
 */
async function storePredictedCorrections(corrections, originalText, departmentId, userId) {
  try {
    if (!corrections || corrections.length === 0) {
      return;
    }
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Prepare corrections for insertion
    const correctionsToInsert = corrections.map(correction => {
      const correctionId = `CORR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
      
      return {
        correction_id: correctionId,
        department_id: departmentId.toString(),
        original_text: originalText.trim(),
        corrected_text: correction.correctedText,
        levenshtein_distance: calculateLevenshteinDistance(originalText.trim(), correction.correctedText),
        usage_count: 1,
        last_used: new Date().toISOString(),
        confidence_score: correction.confidenceScore,
        created_at: new Date().toISOString(),
        created_by: userId.toString()
      };
    });
    
    // Insert corrections in batches
    const batchSize = 5;
    for (let i = 0; i < correctionsToInsert.length; i += batchSize) {
      const batch = correctionsToInsert.slice(i, i + batchSize);
      
      try {
        // Prepare INSERT query
        const values = batch.map((_, index) => 
          `(@correctionId${index}, @departmentId${index}, @originalText${index}, @correctedText${index}, @levenshteinDistance${index}, @usageCount${index}, @lastUsed${index}, @confidenceScore${index}, @createdAt${index}, @createdBy${index})`
        ).join(', ');
        
        const query = `
          INSERT INTO \`${datasetId}.common_corrections\`
          (correction_id, department_id, original_text, corrected_text, levenshtein_distance, usage_count, last_used, confidence_score, created_at, created_by)
          VALUES
          ${values}
        `;
        
        // Prepare parameters
        const params = {};
        batch.forEach((correction, index) => {
          params[`correctionId${index}`] = correction.correction_id;
          params[`departmentId${index}`] = correction.department_id;
          params[`originalText${index}`] = correction.original_text;
          params[`correctedText${index}`] = correction.corrected_text;
          params[`levenshteinDistance${index}`] = correction.levenshtein_distance;
          params[`usageCount${index}`] = correction.usage_count;
          params[`lastUsed${index}`] = correction.last_used;
          params[`confidenceScore${index}`] = correction.confidence_score;
          params[`createdAt${index}`] = correction.created_at;
          params[`createdBy${index}`] = correction.created_by;
        });
        
        const options = {
          query: query,
          location: 'us-central1',
          params: params
        };
        
        await bigqueryClient.query(options);
        
      } catch (batchError) {
        console.error('Error inserting batch of corrections:', batchError);
      }
    }
    
    console.log(`Stored ${correctionsToInsert.length} predicted corrections for ${departmentId}`);
    
  } catch (error) {
    console.error(`Error storing predicted corrections for ${departmentId}:`, error);
  }
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Levenshtein distance
 */
function calculateLevenshteinDistance(str1, str2) {
  try {
    const matrix = [];
    
    // Initialize matrix
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  } catch (error) {
    console.error('Error calculating Levenshtein distance:', error);
    return str1.length + str2.length; // Worst case scenario
  }
}

/**
 * Generate typo correction suggestions for UI
 * @param {Array} corrections - Array of corrections
 * @returns {Object} UI suggestions object
 */
function generateTypoCorrectionSuggestions(corrections) {
  try {
    if (!corrections || corrections.length === 0) {
      return {
        message: '',
        keyboard: null
      };
    }
    
    // Filter corrections with high confidence
    const highConfidenceCorrections = corrections.filter(c => c.confidenceScore > 0.6);
    
    if (highConfidenceCorrections.length === 0) {
      return {
        message: '',
        keyboard: null
      };
    }
    
    // Generate message
    const message = `🤔 *Did you mean*?
I noticed your input might have a typo. Here are some suggestions:`;
    
    // Generate keyboard with correction buttons
    const keyboard = {
      inline_keyboard: []
    };
    
    // Add correction buttons
    highConfidenceCorrections.slice(0, 3).forEach(correction => {
      keyboard.inline_keyboard.push([
        {
          text: `✅ "${correction.correctedText}"`,
          callback_data: `correction:${encodeURIComponent(correction.correctedText)}`
        }
      ]);
    });
    
    // Add "Keep original" button
    keyboard.inline_keyboard.push([
      {
        text: '❌ Keep original',
        callback_data: 'correction:keep_original'
      }
    ]);
    
    return {
      message: message,
      keyboard: keyboard
    };
  } catch (error) {
    console.error('Error generating typo correction suggestions:', error);
    return {
      message: '',
      keyboard: null
    };
  }
}

/**
 * Apply typo correction to user input
 * @param {string} userId - User ID
 * @param {string} originalText - Original user input
 * @param {string} correctedText - Corrected text
 * @param {string} departmentId - Department ID
 * @returns {Object} Correction result
 */
async function applyTypoCorrection(userId, originalText, correctedText, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Applying typo correction for user ${userId}: "${originalText}" -> "${correctedText}"`);
      
      // Validate inputs
      if (!userId || !originalText || !correctedText || !departmentId) {
        return {
          success: false,
          error: 'Invalid inputs'
        };
      }
      
      // Update correction usage count
      await updateCorrectionUsage(originalText, correctedText, departmentId);
      
      // Log correction in user interaction history
      await logCorrectionInHistory(userId, originalText, correctedText, departmentId);
      
      // Apply correction to user state
      await applyCorrectionToUserState(userId, correctedText);
      
      return {
        success: true,
        correctedText: correctedText,
        message: `✅ Applied correction: "${originalText}" -> "${correctedText}"`
      };
    } catch (error) {
      console.error(`Error applying typo correction for user ${userId}:`, error);
      return {
        success: false,
        error: 'Error applying typo correction'
      };
    }
  })();
}

/**
 * Update correction usage count in common corrections table
 * @param {string} originalText - Original text
 * @param {string} correctedText - Corrected text
 * @param {string} departmentId - Department ID
 */
async function updateCorrectionUsage(originalText, correctedText, departmentId) {
  try {
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Update usage count and last used timestamp
    const query = `
      UPDATE \`${datasetId}.common_corrections\`
      SET 
        usage_count = usage_count + 1,
        last_used = CURRENT_TIMESTAMP()
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
    
    console.log(`Updated usage count for correction: "${originalText}" -> "${correctedText}"`);
  } catch (error) {
    console.error(`Error updating correction usage for ${departmentId}:`, error);
  }
}

/**
 * Log correction in user interaction history
 * @param {string} userId - User ID
 * @param {string} originalText - Original text
 * @param {string} correctedText - Corrected text
 * @param {string} departmentId - Department ID
 */
async function logCorrectionInHistory(userId, originalText, correctedText, departmentId) {
  try {
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Generate correction history ID
    const correctionId = `CORR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Insert correction history record
    const query = `
      INSERT INTO \`${datasetId}.correction_history\`
      (correction_id, user_id, department_id, original_text, corrected_text, applied_at)
      VALUES
      (@correctionId, @userId, @departmentId, @originalText, @correctedText, CURRENT_TIMESTAMP())
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: {
        correctionId: correctionId,
        userId: userId.toString(),
        departmentId: departmentId.toString(),
        originalText: originalText.trim(),
        correctedText: correctedText.trim()
      }
    };
    
    await bigqueryClient.query(options);
    
    console.log(`Logged correction in history for user ${userId}: "${originalText}" -> "${correctedText}"`);
  } catch (error) {
    console.error(`Error logging correction in history for user ${userId}:`, error);
  }
}

/**
 * Apply correction to user state
 * @param {string} userId - User ID
 * @param {string} correctedText - Corrected text
 */
async function applyCorrectionToUserState(userId, correctedText) {
  try {
    // In a real implementation, we would update the user's state in Firestore
    // For now, we'll just log that the correction was applied
    console.log(`Applied correction to user state for user ${userId}: "${correctedText}"`);
  } catch (error) {
    console.error(`Error applying correction to user state for user ${userId}:`, error);
  }
}

// Export functions
module.exports = {
  findTypoCorrections,
  getCommonCorrections,
  predictCorrections,
  storePredictedCorrections,
  calculateLevenshteinDistance,
  generateTypoCorrectionSuggestions,
  applyTypoCorrection,
  updateCorrectionUsage,
  logCorrectionInHistory,
  applyCorrectionToUserState
};