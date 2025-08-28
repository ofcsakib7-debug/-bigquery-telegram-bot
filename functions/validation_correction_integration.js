// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 3
// Component: validation_auto_correction_integration
// Status: COMPLETED
// Last Modified: 2025-08-28 12:00 UTC
// Next Step: Implement search system documentation
// =============================================

const { Firestore } = require('@google-cloud/firestore');
const { BigQuery } = require('@google-cloud/bigquery');
const { getFromCache, storeInCache, generateCacheKey } = require('../bigquery/cache');
const { withErrorHandling } = require('./error_handling');
const { validateSyntax } = require('./validation');
const { validateLogic } = require('./logical_validation');
const { checkHeuristicPatterns } = require('./heuristic_check');
const { findTypoCorrections, applyTypoCorrection } = require('./typo_correction');
const { validateDepartmentQuery, validateDepartmentVariables } = require('./department_validation');

// Lazy initialization of clients
let firestore = null;
let bigquery = null;

function getFirestore() {
  if (!firestore) {
    firestore = new Firestore();
  }
  return firestore;
}

function getBigQuery() {
  if (!bigquery) {
    bigquery = new BigQuery();
  }
  return bigquery;
}

/**
 * Integrate validation and auto-correction
 * This function orchestrates the complete validation and correction workflow
 * @param {string} userId - User ID
 * @param {string} queryText - User input text
 * @param {string} departmentId - Department ID
 * @returns {Object} Integrated validation and correction result
 */
async function integrateValidationAndCorrection(userId, queryText, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Integrating validation and correction for user ${userId}: "${queryText}" in department ${departmentId}`);
      
      // Validate inputs
      if (!userId || !queryText || !departmentId) {
        return {
          success: false,
          errorType: 'INTEGRATION',
          errorMessage: 'Invalid inputs',
          suggestions: ['Provide valid userId, queryText, and departmentId']
        };
      }
      
      // Step 1: Syntax Validation (ALWAYS first, 0 quota cost)
      const syntaxValidation = validateSyntax(queryText);
      
      if (!syntaxValidation.valid) {
        return syntaxValidation;
      }
      
      // Step 2: Logical Validation (ALWAYS second, 0 quota cost)
      const logicalValidation = await validateLogic(userId, queryText);
      
      if (!logicalValidation.valid) {
        return logicalValidation;
      }
      
      // Step 3: Heuristic Pattern Check (ALWAYS third, 0 quota cost)
      const heuristicResult = await checkHeuristicPatterns(userId, queryText, departmentId);
      
      if (heuristicResult.suspicious) {
        // Step 4: Semantic Validation (ONLY for suspicious queries)
        const semanticValidation = await validateSemantically(userId, queryText, heuristicResult);
        
        if (!semanticValidation.valid) {
          // If semantic validation fails, try auto-correction
          const corrections = await findTypoCorrections(userId, queryText, departmentId);
          
          if (corrections && corrections.length > 0) {
            // Return corrections as suggestions
            return {
              success: false,
              errorType: 'TYPO',
              errorMessage: `Did you mean one of these?`,
              suggestedCorrections: corrections.slice(0, 3),
              suggestions: corrections.slice(0, 3).map(c => `✅ "${c.correctedText}"`),
              isCorrectable: true
            };
          } else {
            // No corrections found, return semantic validation error
            return semanticValidation;
          }
        }
      }
      
      // Query passed all validation layers
      return {
        success: true,
        validatedQuery: queryText,
        confidenceScore: heuristicResult.confidenceScore || 0.9,
        isSuspicious: false,
        suggestions: []
      };
    } catch (error) {
      console.error(`Error integrating validation and correction for user ${userId}:`, error);
      return {
        success: false,
        errorType: 'INTEGRATION',
        errorMessage: 'Error integrating validation and correction',
        suggestions: ['Try a different query format']
      };
    }
  })();
}

/**
 * Validate semantically for suspicious queries
 * @param {string} userId - User ID
 * @param {string} queryText - User input text
 * @param {Object} heuristicResult - Heuristic analysis result
 * @returns {Object} Semantic validation result
 */
async function validateSemantically(userId, queryText, heuristicResult) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Validating semantically for user ${userId}: "${queryText}" with suspicion score ${heuristicResult.suspicionScore}`);
      
      // Check cache first
      const cacheKey = generateCacheKey('semantic_validation', userId, queryText);
      const cachedValidation = await getFromCache(cacheKey);
      
      if (cachedValidation) {
        console.log(`Using cached semantic validation for user ${userId}`);
        return cachedValidation;
      }
      
      // If heuristic flagged query as suspicious, get typo corrections
      const corrections = await findTypoCorrections(userId, queryText, 'GENERAL');
      
      if (corrections && corrections.length > 0) {
        // Return suggestions for corrections
        const suggestions = corrections.slice(0, 3).map(correction => 
          `✅ "${correction.correctedText}"`
        );
        
        const result = {
          success: false,
          valid: false,
          errorType: 'SEMANTIC',
          errorMessage: `Possible typo detected in your query.`,
          suggestions: [
            ...suggestions,
            'Select one of the suggestions above',
            'Or keep your original query if it was intentional'
          ],
          isCorrectable: true
        };
        
        // Cache for 30 minutes
        await storeInCache(cacheKey, result, 0.5);
        
        return result;
      }
      
      // Query seems legitimate despite heuristic flags
      const result = {
        success: true,
        valid: true,
        errorType: null,
        errorMessage: null,
        suggestions: []
      };
      
      // Cache for 1 hour
      await storeInCache(cacheKey, result, 1);
      
      return result;
    } catch (error) {
      console.error(`Error in semantic validation for user ${userId}:`, error);
      return {
        success: false,
        valid: false,
        errorType: 'SEMANTIC',
        errorMessage: 'Error during semantic validation',
        suggestions: ['Try a different query format']
      };
    }
  })();
}

/**
 * Process search query with validation and auto-correction
 * @param {string} userId - User ID
 * @param {string} queryText - User input text
 * @param {string} departmentId - Department ID
 * @returns {Object} Search processing result
 */
async function processSearchQueryWithValidation(userId, queryText, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Processing search query with validation for user ${userId}: "${queryText}" in department ${departmentId}`);
      
      // Validate inputs
      if (!userId || !queryText || !departmentId) {
        return {
          success: false,
          errorType: 'PROCESSING',
          errorMessage: 'Invalid inputs',
          suggestions: ['Provide valid userId, queryText, and departmentId']
        };
      }
      
      // Step 1: Department-specific validation
      const departmentValidation = await validateDepartmentQuery(userId, queryText, departmentId);
      
      if (!departmentValidation.valid) {
        // Try to find corrections for department-specific errors
        const corrections = await findTypoCorrections(userId, queryText, departmentId);
        
        if (corrections && corrections.length > 0) {
          return {
            success: false,
            errorType: 'DEPARTMENT_VALIDATION',
            errorMessage: departmentValidation.errorMessage,
            suggestedCorrections: corrections.slice(0, 3),
            suggestions: corrections.slice(0, 3).map(c => `✅ "${c.correctedText}"`),
            isCorrectable: true
          };
        }
        
        return departmentValidation;
      }
      
      // Step 2: Multi-layer validation
      const validationResult = await integrateValidationAndCorrection(userId, queryText, departmentId);
      
      if (!validationResult.success) {
        return validationResult;
      }
      
      // Query passed all validation layers
      return {
        success: true,
        validatedQuery: validationResult.validatedQuery,
        confidenceScore: validationResult.confidenceScore,
        isSuspicious: validationResult.isSuspicious,
        suggestions: validationResult.suggestions,
        departmentId: departmentId
      };
    } catch (error) {
      console.error(`Error processing search query with validation for user ${userId}:`, error);
      return {
        success: false,
        errorType: 'PROCESSING',
        errorMessage: 'Error processing search query with validation',
        suggestions: ['Try a different query format']
      };
    }
  })();
}

/**
 * Apply correction to user input
 * @param {string} userId - User ID
 * @param {string} originalText - Original user input
 * @param {string} correctedText - Corrected text
 * @param {string} departmentId - Department ID
 * @returns {Object} Correction result
 */
async function applyCorrection(userId, originalText, correctedText, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Applying correction for user ${userId}: "${originalText}" -> "${correctedText}"`);
      
      // Validate inputs
      if (!userId || !originalText || !correctedText || !departmentId) {
        return {
          success: false,
          error: 'Invalid inputs'
        };
      }
      
      // Apply typo correction
      const correctionResult = await applyTypoCorrection(userId, originalText, correctedText, departmentId);
      
      if (!correctionResult.success) {
        return correctionResult;
      }
      
      // Log correction application
      await logCorrectionApplication(userId, originalText, correctedText, departmentId);
      
      return {
        success: true,
        correctedText: correctedText,
        message: `✅ Applied correction: "${originalText}" -> "${correctedText}"`
      };
    } catch (error) {
      console.error(`Error applying correction for user ${userId}:`, error);
      return {
        success: false,
        error: 'Error applying correction'
      };
    }
  })();
}

/**
 * Log correction application
 * @param {string} userId - User ID
 * @param {string} originalText - Original text
 * @param {string} correctedText - Corrected text
 * @param {string} departmentId - Department ID
 */
async function logCorrectionApplication(userId, originalText, correctedText, departmentId) {
  try {
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Generate correction application ID
    const applicationId = `APP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Insert correction application record
    const query = `
      INSERT INTO \`${datasetId}.correction_applications\`
      (application_id, user_id, department_id, original_text, corrected_text, applied_at)
      VALUES
      (@applicationId, @userId, @departmentId, @originalText, @correctedText, CURRENT_TIMESTAMP())
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: {
        applicationId: applicationId,
        userId: userId.toString(),
        departmentId: departmentId.toString(),
        originalText: originalText.trim(),
        correctedText: correctedText.trim()
      }
    };
    
    await bigqueryClient.query(options);
    
    console.log(`Logged correction application for user ${userId}: "${originalText}" -> "${correctedText}"`);
  } catch (error) {
    console.error(`Error logging correction application for user ${userId}:`, error);
  }
}

/**
 * Generate validation and correction suggestions for UI
 * @param {Object} validationResult - Validation result
 * @returns {Object} UI suggestions object
 */
function generateValidationSuggestions(validationResult) {
  try {
    if (!validationResult) {
      return {
        message: '',
        keyboard: null
      };
    }
    
    // If validation passed
    if (validationResult.success) {
      return {
        message: '✅ Query validation passed',
        keyboard: null
      };
    }
    
    // If there are suggested corrections
    if (validationResult.suggestedCorrections && validationResult.suggestedCorrections.length > 0) {
      // Generate message
      const message = `🤔 *Did you mean*?\nI noticed your input might have a typo. Here are some suggestions:`;
      
      // Generate keyboard with correction buttons
      const keyboard = {
        inline_keyboard: []
      };
      
      // Add correction buttons
      validationResult.suggestedCorrections.slice(0, 3).forEach(correction => {
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
    }
    
    // Generic error message
    const message = `❌ *Validation Error*\n${validationResult.errorMessage || 'Invalid input'}`;
    
    // Add suggestions if available
    if (validationResult.suggestions && validationResult.suggestions.length > 0) {
      message += `\n\n💡 *Suggestions*:\n${validationResult.suggestions.join('\n')}`;
    }
    
    return {
      message: message,
      keyboard: null
    };
  } catch (error) {
    console.error('Error generating validation suggestions:', error);
    return {
      message: '',
      keyboard: null
    };
  }
}

// Export functions
module.exports = {
  integrateValidationAndCorrection,
  validateSemantically,
  processSearchQueryWithValidation,
  applyCorrection,
  logCorrectionApplication,
  generateValidationSuggestions
};