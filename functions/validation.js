// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 3
// Component: validation_layer_1_syntax
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 15:00 UTC
// Next Step: Implement logical validation layer
// =============================================

const { validateInputPattern } = require('./security');

/**
 * Layer 1: Syntax Validation
 * Performs basic syntax validation with 0 quota cost
 * @param {string} queryText - User input text
 * @returns {Object} Validation result
 */
function validateSyntax(queryText) {
  try {
    // Return early if input is empty or not a string
    if (!queryText || typeof queryText !== 'string') {
      return {
        valid: false,
        errorType: 'SYNTAX',
        errorMessage: 'Invalid input: Please enter a valid search query',
        suggestions: []
      };
    }
    
    // Trim and normalize input
    const normalizedInput = queryText.trim();
    
    // Check character set (only allowed characters)
    if (!validateInputPattern(normalizedInput, '^[a-z0-9\\s{}\\-=]+$')) {
      return {
        valid: false,
        errorType: 'SYNTAX',
        errorMessage: 'Invalid characters. Use only lowercase letters, numbers, spaces, and {variables}',
        suggestions: [
          'Use only lowercase letters (a-z)',
          'Use only numbers (0-9)',
          'Use spaces to separate words',
          'Use {variable} format for variables'
        ]
      };
    }
    
    // Check length constraints
    if (normalizedInput.length < 2 || normalizedInput.length > 20) {
      const lengthError = normalizedInput.length < 2 
        ? 'Query too short. Minimum 2 characters required'
        : 'Query too long. Maximum 20 characters allowed';
      
      return {
        valid: false,
        errorType: 'SYNTAX',
        errorMessage: lengthError,
        suggestions: normalizedInput.length < 2 
          ? [
              'Enter at least 2 characters',
              'Try a longer search term',
              'Use meaningful abbreviations'
            ]
          : [
              'Keep queries under 20 characters',
              'Use abbreviations (e.g., "t" for "total")',
              'Remove unnecessary words'
            ]
      };
    }
    
    // Check variable format (if present)
    if (normalizedInput.includes('{') || normalizedInput.includes('}')) {
      // Validate variable format: {name} where name is alphanumeric
      if (!validateInputPattern(normalizedInput, '^[^{}]*({[a-z0-9]+}[^{}]*)*$')) {
        return {
          valid: false,
          errorType: 'SYNTAX',
          errorMessage: 'Invalid variable format. Use {name} where name is alphanumeric',
          suggestions: [
            'Variables must be enclosed in curly braces',
            'Variable names must be lowercase alphanumeric',
            'Example: {name}, {id}, {time}'
          ]
        };
      }
      
      // Check for balanced braces
      const openBraces = (normalizedInput.match(/{/g) || []).length;
      const closeBraces = (normalizedInput.match(/}/g) || []).length;
      
      if (openBraces !== closeBraces) {
        return {
          valid: false,
          errorType: 'SYNTAX',
          errorMessage: 'Unbalanced curly braces. Each { must have a matching }',
          suggestions: [
            'Check that every opening brace { has a closing brace }',
            'Remove unmatched braces',
            'Example: {name} is correct, {name is incorrect'
          ]
        };
      }
    }
    
    // Check for consecutive spaces
    if (normalizedInput.includes('  ')) {
      return {
        valid: false,
        errorType: 'SYNTAX',
        errorMessage: 'Consecutive spaces not allowed',
        suggestions: [
          'Remove extra spaces between words',
          'Use single space to separate terms',
          'Example: "t bnk p cm" not "t  bnk  p  cm"'
        ]
      };
    }
    
    // Check for leading/trailing spaces (after trim, should not have any)
    if (queryText !== normalizedInput) {
      return {
        valid: false,
        errorType: 'SYNTAX',
        errorMessage: 'Leading or trailing spaces not allowed',
        suggestions: [
          'Remove spaces at beginning or end of query',
          'Trim your input before submitting',
          'Example: "t bnk p cm" not " t bnk p cm "'
        ]
      };
    }
    
    // All syntax checks passed
    return {
      valid: true,
      errorType: null,
      errorMessage: null,
      suggestions: []
    };
  } catch (error) {
    console.error('Error in syntax validation:', error);
    return {
      valid: false,
      errorType: 'SYNTAX',
      errorMessage: 'Error validating syntax',
      suggestions: ['Try a different query format']
    };
  }
}

/**
 * Validate multi-model quantity search format
 * @param {string} queryText - User input text
 * @returns {Object} Validation result
 */
function validateMultiModelFormat(queryText) {
  try {
    // Multi-model format: model_code=quantity (e.g., "a2b=2 e4s=3")
    const multiModelRegex = /^([a-z0-9]{2,4}=\d{1,2}\s*)+$/i;
    
    if (!multiModelRegex.test(queryText.trim())) {
      return {
        valid: false,
        errorType: 'SYNTAX',
        errorMessage: 'Invalid multi-model format. Use model_code=quantity',
        suggestions: [
          'Format: model_code=quantity',
          'Example: "a2b=2 e4s=3"',
          'Model codes: 2-4 alphanumeric characters',
          'Quantities: 1-2 digit numbers'
        ]
      };
    }
    
    // Validate individual model-quantity pairs
    const pairs = queryText.trim().split(/\s+/);
    for (const pair of pairs) {
      const [modelCode, quantityStr] = pair.split('=');
      
      // Validate model code format
      if (!modelCode || !validateInputPattern(modelCode, '^[a-z0-9]{2,4}$')) {
        return {
          valid: false,
          errorType: 'SYNTAX',
          errorMessage: `Invalid model code: ${modelCode}. Use 2-4 alphanumeric characters`,
          suggestions: [
            'Model codes must be 2-4 alphanumeric characters',
            'Example: a2b, e4s, t5c',
            'No spaces or special characters allowed'
          ]
        };
      }
      
      // Validate quantity format
      const quantity = parseInt(quantityStr, 10);
      if (isNaN(quantity) || quantity < 1 || quantity > 99) {
        return {
          valid: false,
          errorType: 'SYNTAX',
          errorMessage: `Invalid quantity: ${quantityStr}. Use 1-99`,
          suggestions: [
            'Quantities must be numbers between 1-99',
            'Example: 1, 2, 15, 99',
            'No decimal points or special characters allowed'
          ]
        };
      }
    }
    
    // All multi-model format checks passed
    return {
      valid: true,
      errorType: null,
      errorMessage: null,
      suggestions: []
    };
  } catch (error) {
    console.error('Error validating multi-model format:', error);
    return {
      valid: false,
      errorType: 'SYNTAX',
      errorMessage: 'Error validating multi-model format',
      suggestions: ['Try a different multi-model format']
    };
  }
}

/**
 * Validate time period format
 * @param {string} timePeriod - Time period text
 * @returns {Object} Validation result
 */
function validateTimePeriodFormat(timePeriod) {
  try {
    // Valid time periods: cm, lm, lw, tw, ly
    const validTimePeriods = ['cm', 'lm', 'lw', 'tw', 'ly'];
    
    if (!validTimePeriods.includes(timePeriod.toLowerCase())) {
      return {
        valid: false,
        errorType: 'SYNTAX',
        errorMessage: `Invalid time period: ${timePeriod}. Valid options: cm, lm, lw, tw, ly`,
        suggestions: [
          'cm = current month',
          'lm = last month',
          'lw = last week',
          'tw = this week',
          'ly = last year',
          'Use one of these exact codes'
        ]
      };
    }
    
    // Time period format is valid
    return {
      valid: true,
      errorType: null,
      errorMessage: null,
      suggestions: []
    };
  } catch (error) {
    console.error('Error validating time period format:', error);
    return {
      valid: false,
      errorType: 'SYNTAX',
      errorMessage: 'Error validating time period format',
      suggestions: ['Use valid time period codes: cm, lm, lw, tw, ly']
    };
  }
}

// Export functions
module.exports = {
  validateSyntax,
  validateMultiModelFormat,
  validateTimePeriodFormat
};