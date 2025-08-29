/**
 * Multi-Input Command Processing Engine
 * 
 * This module implements the core functionality for processing multiple data inputs
 * in a single message as specified in Design 8.
 */

const { BigQuery } = require('@google-cloud/bigquery');
const { validateSyntax, validateMultiModelFormat } = require('./validation');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Process a multi-input command message
 * @param {string} messageText - The text of the message to process
 * @param {string} userId - Telegram user ID
 * @param {string} departmentId - User's department ID
 * @returns {Object} Processing result with immediate response and background processing
 */
async function processMultiInputCommand(messageText, userId, departmentId) {
  try {
    // Send immediate acknowledgment
    const acknowledgment = {
      text: 'Processing your request...',
      shouldSend: true
    };

    // Split message into segments (space-separated)
    const segments = messageText.trim().split(/\s+/);
    
    // Validate segment count (must not exceed 5)
    if (segments.length > 5) {
      return {
        acknowledgment,
        result: {
          valid: false,
          errorType: 'SEGMENT_COUNT',
          errorMessage: 'Too many segments. Maximum 5 segments allowed.',
          suggestions: await getSuggestionsForError('SEGMENT_COUNT', departmentId)
        }
      };
    }

    // Process each segment
    const segmentResults = [];
    for (const segment of segments) {
      const result = await processSegment(segment, departmentId, userId);
      segmentResults.push(result);
    }

    // Check if all segments are valid
    const allValid = segmentResults.every(result => result.valid);
    
    if (allValid) {
      // All segments are valid, proceed with processing
      const processingResult = await processValidSegments(segmentResults, userId, departmentId);
      
      return {
        acknowledgment,
        result: processingResult
      };
    } else {
      // Some segments have errors, provide suggestions
      const errorSegments = segmentResults.filter(result => !result.valid);
      const suggestions = await getSuggestionsForErrors(errorSegments, departmentId);
      
      return {
        acknowledgment,
        result: {
          valid: false,
          errorType: 'INVALID_SEGMENTS',
          errorMessage: 'Some segments contain errors.',
          suggestions,
          segmentResults
        }
      };
    }
  } catch (error) {
    console.error('Error processing multi-input command:', error);
    return {
      acknowledgment: {
        text: 'Processing your request...',
        shouldSend: true
      },
      result: {
        valid: false,
        errorType: 'PROCESSING_ERROR',
        errorMessage: 'Error processing your request. Please try again.',
        suggestions: await getSuggestionsForError('PROCESSING_ERROR', departmentId)
      }
    };
  }
}

/**
 * Process a single segment
 * @param {string} segment - The segment to process
 * @param {string} departmentId - User's department ID
 * @param {string} userId - Telegram user ID
 * @returns {Object} Segment processing result
 */
async function processSegment(segment, departmentId, userId) {
  try {
    // Layer 1: Syntax validation (0 quota cost)
    const syntaxResult = validateSyntax(segment);
    if (!syntaxResult.valid) {
      return {
        valid: false,
        segment,
        errorType: 'SYNTAX',
        errorMessage: syntaxResult.errorMessage,
        suggestions: syntaxResult.suggestions
      };
    }

    // Layer 2: Department-specific pattern validation (0 quota cost)
    const patternResult = await validateDepartmentPattern(segment, departmentId, userId);
    if (!patternResult.valid) {
      return {
        valid: false,
        segment,
        errorType: 'PATTERN',
        errorMessage: patternResult.errorMessage,
        suggestions: patternResult.suggestions
      };
    }

    // Layer 3: BigQuery validation (if needed)
    // This would typically be done in background processing for quota savings
    return {
      valid: true,
      segment,
      parsedData: patternResult.parsedData
    };
  } catch (error) {
    console.error('Error processing segment:', error);
    return {
      valid: false,
      segment,
      errorType: 'SEGMENT_PROCESSING_ERROR',
      errorMessage: 'Error processing segment.',
      suggestions: await getSuggestionsForError('SEGMENT_PROCESSING_ERROR', departmentId)
    };
  }
}

/**
 * Validate segment against department-specific patterns
 * @param {string} segment - The segment to validate
 * @param {string} departmentId - User's department ID
 * @param {string} userId - Telegram user ID
 * @returns {Object} Validation result
 */
async function validateDepartmentPattern(segment, departmentId, userId) {
  try {
    // Import department-specific validation functions
    const {
      validateInventorySegment,
      validateAdminSegment,
      validateFinanceSegment,
      validateServiceSegment,
      validateSalesSegment,
      validateHrSegment,
      validateManagementSegment
    } = require('./department_validations');
    
    // Import admin check function
    const { isAdmin } = require('./admin_management');
    
    // Apply department-specific validation (0 quota cost)
    switch (departmentId) {
      case 'INVENTORY':
        return validateInventorySegment(segment);
      
      case 'ADMIN':
        // Check if user has admin privileges
        const isAdminUser = await isAdmin(userId);
        return validateAdminSegment(isAdminUser, segment);
      
      case 'FINANCE':
        return validateFinanceSegment(segment);
      
      case 'SERVICE':
        return validateServiceSegment(segment);
      
      case 'SALES':
        return validateSalesSegment(segment);
      
      case 'HR':
        return validateHrSegment(segment);
      
      case 'MANAGEMENT':
        return validateManagementSegment(segment);
      
      default:
        // For other departments, use BigQuery patterns
        // Get department-specific patterns from BigQuery
        const patterns = await getDepartmentPatterns(departmentId);
        
        // Try to match segment against patterns
        for (const pattern of patterns) {
          const regex = new RegExp(pattern.pattern);
          if (regex.test(segment)) {
            // Pattern matches, parse the segment
            const parsedData = parseSegmentWithLogic(segment, pattern.parsing_logic);
            
            // Update pattern usage count
            await updatePatternUsage(pattern.pattern_id);
            
            return {
              valid: true,
              patternId: pattern.pattern_id,
              parsedData
            };
          }
        }
        
        // No pattern matched
        return {
          valid: false,
          errorMessage: 'Invalid format for this department.',
          suggestions: await getSuggestionsForDepartment(departmentId)
        };
    }
  } catch (error) {
    console.error('Error validating department pattern:', error);
    return {
      valid: false,
      errorMessage: 'Error validating pattern.',
      suggestions: []
    };
  }
}

/**
 * Get department-specific patterns from BigQuery
 * @param {string} departmentId - Department ID
 * @returns {Array} Array of pattern objects
 */
async function getDepartmentPatterns(departmentId) {
  try {
    const query = `
      SELECT pattern_id, pattern, parsing_logic
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.$\{process.env.BIGQUERY_DATASET_ID || 'dataset'}.command_patterns\`
      WHERE department_id = @departmentId
      ORDER BY priority_score DESC
      LIMIT 10
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: { departmentId }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting department patterns:', error);
    return [];
  }
}

/**
 * Parse segment using parsing logic
 * @param {string} segment - The segment to parse
 * @param {string} parsingLogic - The parsing logic to apply
 * @returns {Object} Parsed data
 */
function parseSegmentWithLogic(segment, parsingLogic) {
  try {
    // This is a simplified implementation
    // In a real system, this would need to be more robust
    if (parsingLogic.includes('SPLIT')) {
      const parts = segment.split('=');
      return {
        modelCode: parts[0],
        quantity: parseInt(parts[1], 10)
      };
    }
    
    if (parsingLogic.includes('REGEXP_EXTRACT')) {
      // Extract value using regex
      const match = segment.match(/=([a-zA-Z0-9]+)/);
      if (match) {
        return {
          value: match[1]
        };
      }
    }
    
    return {
      raw: segment
    };
  } catch (error) {
    console.error('Error parsing segment:', error);
    return {
      raw: segment
    };
  }
}

/**
 * Update pattern usage count
 * @param {string} patternId - Pattern ID
 */
async function updatePatternUsage(patternId) {
  try {
    const query = `
      UPDATE \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.$\{process.env.BIGQUERY_DATASET_ID || 'dataset'}.command_patterns\`
      SET usage_count = usage_count + 1, last_used = CURRENT_TIMESTAMP()
      WHERE pattern_id = @patternId
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: { patternId }
    };
    
    await bigquery.createQueryJob(options);
  } catch (error) {
    console.error('Error updating pattern usage:', error);
  }
}

/**
 * Process valid segments
 * @param {Array} segmentResults - Array of valid segment results
 * @param {string} userId - Telegram user ID
 * @param {string} departmentId - User's department ID
 * @returns {Object} Processing result
 */
async function processValidSegments(segmentResults, userId, departmentId) {
  try {
    // This would typically involve more complex processing
    // For now, we'll just return a success message
    return {
      valid: true,
      message: 'All segments processed successfully.',
      segmentResults,
      suggestions: await getSuggestionsForSuccess(departmentId)
    };
  } catch (error) {
    console.error('Error processing valid segments:', error);
    return {
      valid: false,
      errorType: 'PROCESSING_ERROR',
      errorMessage: 'Error processing segments.',
      suggestions: await getSuggestionsForError('PROCESSING_ERROR', departmentId)
    };
  }
}

/**
 * Get suggestions for an error type
 * @param {string} errorType - Type of error
 * @param {string} departmentId - Department ID
 * @returns {Array} Array of suggestion objects
 */
async function getSuggestionsForError(errorType, departmentId) {
  try {
    const query = `
      SELECT action_text, action_data, confidence_score
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.$\{process.env.BIGQUERY_DATASET_ID || 'dataset'}.contextual_actions\`
      WHERE department_id = @departmentId
      AND context_type = 'ERROR'
      AND primary_intent = @errorType
      ORDER BY confidence_score DESC
      LIMIT 4
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: { departmentId, errorType }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.map(row => ({
      text: row.action_text,
      callback_data: row.action_data
    }));
  } catch (error) {
    console.error('Error getting error suggestions:', error);
    return [];
  }
}

/**
 * Get suggestions for department
 * @param {string} departmentId - Department ID
 * @returns {Array} Array of suggestion objects
 */
async function getSuggestionsForDepartment(departmentId) {
  try {
    const query = `
      SELECT action_text, action_data, confidence_score
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.$\{process.env.BIGQUERY_DATASET_ID || 'dataset'}.contextual_actions\`
      WHERE department_id = @departmentId
      AND context_type = 'ERROR'
      AND primary_intent = 'INVALID_FORMAT'
      ORDER BY confidence_score DESC
      LIMIT 4
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: { departmentId }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.map(row => ({
      text: row.action_text,
      callback_data: row.action_data
    }));
  } catch (error) {
    console.error('Error getting department suggestions:', error);
    return [];
  }
}

/**
 * Get suggestions for successful processing
 * @param {string} departmentId - Department ID
 * @returns {Array} Array of suggestion objects
 */
async function getSuggestionsForSuccess(departmentId) {
  try {
    const query = `
      SELECT action_text, action_data, confidence_score
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.$\{process.env.BIGQUERY_DATASET_ID || 'dataset'}.contextual_actions\`
      WHERE department_id = @departmentId
      AND context_type = 'RESULT'
      AND primary_intent = 'MULTI_MODEL_SEARCH'
      ORDER BY confidence_score DESC
      LIMIT 4
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: { departmentId }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.map(row => ({
      text: row.action_text,
      callback_data: row.action_data
    }));
  } catch (error) {
    console.error('Error getting success suggestions:', error);
    return [];
  }
}

/**
 * Get suggestions for multiple errors
 * @param {Array} errorSegments - Array of error segment objects
 * @param {string} departmentId - Department ID
 * @returns {Array} Array of suggestion objects
 */
async function getSuggestionsForErrors(errorSegments, departmentId) {
  try {
    // For simplicity, we'll just get suggestions for the first error
    if (errorSegments.length > 0) {
      return await getSuggestionsForError(errorSegments[0].errorType, departmentId);
    }
    return [];
  } catch (error) {
    console.error('Error getting multiple error suggestions:', error);
    return [];
  }
}

// Export functions
module.exports = {
  processMultiInputCommand
};
