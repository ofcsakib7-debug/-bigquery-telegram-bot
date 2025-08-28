// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 3
// Component: validation_layer_2_logical
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 15:15 UTC
// Next Step: Implement heuristic pattern check layer
// =============================================

const { Firestore } = require('@google-cloud/firestore');
const { validateInputPattern } = require('../security');
const { validateSyntax } = require('./validation_syntax');

// Lazy initialization of Firestore
let firestore = null;
function getFirestore() {
  if (!firestore) {
    firestore = new Firestore();
  }
  return firestore;
}

/**
 * Layer 2: Logical Validation
 * Performs department-specific logical validation with 0 quota cost
 * @param {string} userId - User ID
 * @param {string} queryText - User input text
 * @returns {Object} Validation result
 */
async function validateLogic(userId, queryText) {
  return await withErrorHandling(async () => {
    try {
      // Validate user ID
      if (!userId || userId.length === 0) {
        return {
          valid: false,
          errorType: 'LOGIC',
          errorMessage: 'Invalid user ID',
          suggestions: ['Please log in again']
        };
      }
      
      // Validate query text
      if (!queryText || queryText.length === 0) {
        return {
          valid: false,
          errorType: 'LOGIC',
          errorMessage: 'Empty query not allowed',
          suggestions: ['Enter a search query']
        };
      }
      
      // Get user profile
      const userDepartment = await getUserDepartment(userId);
      if (!userDepartment) {
        return {
          valid: false,
          errorType: 'LOGIC',
          errorMessage: 'User profile not found',
          suggestions: ['Contact administrator to set up your profile']
        };
      }
      
      // Get department-specific patterns
      const departmentPatterns = await getDepartmentPatterns(userDepartment);
      if (!departmentPatterns || departmentPatterns.length === 0) {
        return {
          valid: false,
          errorType: 'LOGIC',
          errorMessage: 'No department patterns found',
          suggestions: [`No patterns configured for ${userDepartment} department`]
        };
      }
      
      // Check if query matches any valid pattern structure
      const patternMatch = findMatchingPattern(queryText, departmentPatterns);
      
      if (!patternMatch) {
        // Find closest matching patterns for suggestions
        const suggestions = findClosestPatterns(queryText, departmentPatterns);
        return {
          valid: false,
          errorType: 'LOGIC',
          errorMessage: `Invalid search pattern for ${userDepartment} department.`,
          suggestions: suggestions
        };
      }
      
      // Check variable constraints (if applicable)
      const variables = extractVariables(queryText, patternMatch.pattern);
      const variableErrors = await validateVariables(variables, userDepartment);
      
      if (variableErrors.length > 0) {
        return {
          valid: false,
          errorType: 'LOGIC',
          errorMessage: `Invalid parameters: ${variableErrors.join(', ')}`,
          suggestions: generateVariableSuggestions(variables, patternMatch, userDepartment)
        };
      }
      
      // Query passed all logical validation
      return {
        valid: true,
        errorType: null,
        errorMessage: null,
        suggestions: [],
        matchedPattern: patternMatch
      };
    } catch (error) {
      console.error(`Error in logical validation for user ${userId}:`, error);
      return {
        valid: false,
        errorType: 'LOGIC',
        errorMessage: 'Error validating query logic',
        suggestions: ['Try a different query format']
      };
    }
  })();
}

/**
 * Get user department from Firestore
 * @param {string} userId - User ID
 * @returns {string|null} Department ID or null if not found
 */
async function getUserDepartment(userId) {
  try {
    const firestoreClient = getFirestore();
    const userDoc = await firestoreClient.collection('user_profiles').doc(userId.toString()).get();
    const userData = userDoc.data();
    
    if (userData && userData.departmentId) {
      return userData.departmentId;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting user department for user ${userId}:`, error);
    return null;
  }
}

/**
 * Get department-specific patterns from Firestore
 * @param {string} departmentId - Department ID
 * @returns {Array} Department patterns
 */
async function getDepartmentPatterns(departmentId) {
  try {
    const firestoreClient = getFirestore();
    const patternsSnapshot = await firestoreClient
      .collection('search_intention_patterns')
      .where('department_id', '==', departmentId)
      .orderBy('priority_score', 'desc')
      .limit(100)
      .get();
    
    const patterns = [];
    patternsSnapshot.forEach(doc => {
      patterns.push(doc.data());
    });
    
    return patterns;
  } catch (error) {
    console.error(`Error getting department patterns for ${departmentId}:`, error);
    return [];
  }
}

/**
 * Find matching pattern for query text
 * @param {string} queryText - User input text
 * @param {Array} patterns - Department patterns
 * @returns {Object|null} Matching pattern or null if not found
 */
function findMatchingPattern(queryText, patterns) {
  try {
    // Check if query matches any valid pattern structure
    for (const pattern of patterns) {
      // Convert pattern regex to JavaScript regex
      const regexPattern = convertPatternToRegex(pattern.pattern);
      if (regexPattern.test(queryText)) {
        return pattern;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding matching pattern:', error);
    return null;
  }
}

/**
 * Convert pattern to JavaScript regex
 * @param {string} patternText - Pattern text
 * @returns {RegExp} JavaScript regex
 */
function convertPatternToRegex(patternText) {
  try {
    // Escape special regex characters and convert {variable} to capture groups
    let regexPattern = patternText
      .replace(/[.*+?^${}()|[\\]\\/]/g, '\\$&') // Escape special regex characters
      .replace(/\\\{([a-zA-Z0-9_]+)\\\}/g, '(.+)'); // Convert {variable} to capture groups
    
    // Allow word boundaries
    regexPattern = `^${regexPattern}$`;
    
    return new RegExp(regexPattern, 'i');
  } catch (error) {
    console.error('Error converting pattern to regex:', error);
    return new RegExp('^$', 'i'); // Match nothing on error
  }
}

/**
 * Find closest matching patterns for suggestions
 * @param {string} queryText - User input text
 * @param {Array} patterns - Department patterns
 * @returns {Array} Closest matching patterns
 */
function findClosestPatterns(queryText, patterns) {
  try {
    // Calculate similarity scores for all patterns
    const scoredPatterns = patterns.map(pattern => {
      const similarity = calculateSimilarity(queryText, pattern.pattern);
      return {
        ...pattern,
        similarity: similarity
      };
    });
    
    // Sort by similarity (highest first) and take top 3
    return scoredPatterns
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)
      .map(pattern => 
        `Try: "${pattern.pattern}" (${pattern.expanded_query})`
      );
  } catch (error) {
    console.error('Error finding closest patterns:', error);
    return [];
  }
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1)
 */
function calculateSimilarity(str1, str2) {
  try {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  } catch (error) {
    console.error('Error calculating similarity:', error);
    return 0.0;
  }
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
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
 * Extract variables from query text
 * @param {string} queryText - User input text
 * @param {string} patternText - Pattern text
 * @returns {Object} Extracted variables
 */
function extractVariables(queryText, patternText) {
  try {
    const variables = {};
    
    // Find variables in pattern
    const variableMatches = patternText.match(/{[a-zA-Z0-9_]+}/g);
    
    if (variableMatches) {
      // Convert pattern to regex with capture groups
      const regexPattern = convertPatternToRegex(patternText);
      const match = queryText.match(regexPattern);
      
      if (match) {
        // Extract captured groups
        variableMatches.forEach((variable, index) => {
          const variableName = variable.replace(/[{}]/g, '');
          variables[variableName] = match[index + 1] || '';
        });
      }
    }
    
    return variables;
  } catch (error) {
    console.error('Error extracting variables:', error);
    return {};
  }
}

/**
 * Validate variables for a department
 * @param {Object} variables - Extracted variables
 * @param {string} departmentId - Department ID
 * @returns {Array} Validation errors
 */
async function validateVariables(variables, departmentId) {
  try {
    const errors = [];
    
    // Validate each variable based on department rules
    for (const [varName, varValue] of Object.entries(variables)) {
      switch (varName) {
        case 'time':
          if (varValue && !isValidTimePeriod(varValue)) {
            errors.push(`'${varValue}' is not a valid time period`);
          }
          break;
        case 'amount':
          if (varValue && !isValidAmount(varValue)) {
            errors.push(`'${varValue}' is not a valid amount`);
          }
          break;
        case 'date':
          if (varValue && !isValidDate(varValue)) {
            errors.push(`'${varValue}' is not a valid date`);
          }
          break;
        case 'quantity':
          if (varValue && !isValidQuantity(varValue)) {
            errors.push(`'${varValue}' is not a valid quantity`);
          }
          break;
        default:
          // Generic validation for other variables
          if (varValue && !validateInputPattern(varValue, '^[a-zA-Z0-9\\s\\-]+$')) {
            errors.push(`'${varValue}' contains invalid characters`);
          }
          break;
      }
    }
    
    return errors;
  } catch (error) {
    console.error('Error validating variables:', error);
    return ['Error validating variables'];
  }
}

/**
 * Check if time period is valid
 * @param {string} timePeriod - Time period
 * @returns {boolean} True if valid
 */
function isValidTimePeriod(timePeriod) {
  try {
    const validTimePeriods = ['cm', 'lm', 'lw', 'tw', 'ly'];
    return validTimePeriods.includes(timePeriod.toLowerCase());
  } catch (error) {
    console.error('Error validating time period:', error);
    return false;
  }
}

/**
 * Check if amount is valid
 * @param {string} amount - Amount
 * @returns {boolean} True if valid
 */
function isValidAmount(amount) {
  try {
    const amountRegex = /^\\d{1,10}(\\.\\d{1,2})?$/;
    return amountRegex.test(amount);
  } catch (error) {
    console.error('Error validating amount:', error);
    return false;
  }
}

/**
 * Check if date is valid
 * @param {string} date - Date
 * @returns {boolean} True if valid
 */
function isValidDate(date) {
  try {
    // Accept multiple date formats
    const dateFormats = [
      /^\\d{4}-\\d{2}-\\d{2}$/,     // YYYY-MM-DD
      /^\\d{2}\\/\\d{2}\\/\\d{4}$/,   // MM/DD/YYYY
      /^\\d{2}-\\d{2}-\\d{4}$/      // MM-DD-YYYY
    ];
    
    return dateFormats.some(format => format.test(date));
  } catch (error) {
    console.error('Error validating date:', error);
    return false;
  }
}

/**
 * Check if quantity is valid
 * @param {string} quantity - Quantity
 * @returns {boolean} True if valid
 */
function isValidQuantity(quantity) {
  try {
    const quantityRegex = /^\\d{1,2}$/;
    const qty = parseInt(quantity, 10);
    return quantityRegex.test(quantity) && qty >= 1 && qty <= 99;
  } catch (error) {
    console.error('Error validating quantity:', error);
    return false;
  }
}

/**
 * Generate variable suggestions
 * @param {Object} variables - Extracted variables
 * @param {Object} pattern - Matched pattern
 * @param {string} departmentId - Department ID
 * @returns {Array} Variable suggestions
 */
function generateVariableSuggestions(variables, pattern, departmentId) {
  try {
    const suggestions = [];
    
    // Add general pattern suggestions
    suggestions.push(`Pattern: "${pattern.pattern}"`);
    suggestions.push(`Meaning: "${pattern.expanded_query}"`);
    
    // Add variable-specific suggestions
    for (const [varName, varValue] of Object.entries(variables)) {
      switch (varName) {
        case 'time':
          suggestions.push('Valid time periods: cm, lm, lw, tw, ly');
          suggestions.push('cm = current month, lm = last month, lw = last week');
          suggestions.push('tw = this week, ly = last year');
          break;
        case 'amount':
          suggestions.push('Valid amounts: numbers with up to 2 decimal places');
          suggestions.push('Example: 1234.56, 1000, 50.25');
          break;
        case 'date':
          suggestions.push('Valid date formats: YYYY-MM-DD, MM/DD/YYYY, MM-DD-YYYY');
          suggestions.push('Example: 2023-11-05, 11/05/2023, 11-05-2023');
          break;
        case 'quantity':
          suggestions.push('Valid quantities: numbers from 1-99');
          suggestions.push('Example: 1, 2, 15, 99');
          break;
        default:
          suggestions.push(`Valid ${varName}: letters, numbers, spaces, hyphens`);
          suggestions.push(`Example: ${varName} value`);
          break;
      }
    }
    
    return suggestions;
  } catch (error) {
    console.error('Error generating variable suggestions:', error);
    return [`Pattern: "${pattern.pattern}"`, `Meaning: "${pattern.expanded_query}"`];
  }
}

/**
 * Error handling wrapper
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function with error handling
 */
function withErrorHandling(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Error in validation function:', error);
      return {
        valid: false,
        errorType: 'VALIDATION_ERROR',
        errorMessage: 'An error occurred during validation',
        suggestions: ['Try again later']
      };
    }
  };
}

// Export functions
module.exports = {
  validateLogic,
  getUserDepartment,
  getDepartmentPatterns,
  findMatchingPattern,
  findClosestPatterns,
  extractVariables,
  validateVariables,
  withErrorHandling
};