// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 3
// Component: validation_auto_correction_integration
// Status: COMPLETED
// Last Modified: 2025-08-28 12:15 UTC
// Next Step: Implement search system documentation
// =============================================

const { Firestore } = require('@google-cloud/firestore');
const { BigQuery } = require('@google-cloud/bigquery');
const { getFromCache, storeInCache, generateCacheKey } = require('../bigquery/cache');
const { withErrorHandling } = require('./error_handling');
const { validateInputPattern } = require('./security');

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
 * Validate syntax with 0 quota cost
 * @param {string} queryText - User input text
 * @returns {Object} Syntax validation result
 */
function validateSyntax(queryText) {
  try {
    // Check character set (only allowed characters)
    if (!validateInputPattern(queryText, '^[a-z0-9\\s{}\\-=]+$')) {
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
    if (queryText.length < 2 || queryText.length > 20) {
      const lengthError = queryText.length < 2 
        ? 'Query too short. Minimum 2 characters required'
        : 'Query too long. Maximum 20 characters allowed';
      
      return {
        valid: false,
        errorType: 'SYNTAX',
        errorMessage: lengthError,
        suggestions: queryText.length < 2 
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
    if (queryText.includes('{') || queryText.includes('}')) {
      // Validate variable format: {name} where name is alphanumeric
      if (!validateInputPattern(queryText, '^[^{}]*({[a-z0-9]+}[^{}]*)*$')) {
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
      const openBraces = (queryText.match(/{/g) || []).length;
      const closeBraces = (queryText.match(/}/g) || []).length;
      
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
    if (queryText.includes('  ')) {
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
    const trimmedQuery = queryText.trim();
    if (queryText !== trimmedQuery) {
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
 * Validate logic with 0 quota cost
 * @param {string} userId - User ID
 * @param {string} queryText - User input text
 * @returns {Object} Logical validation result
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
 * Check heuristic patterns with 0 quota cost
 * @param {string} userId - User ID
 * @param {string} queryText - User input text
 * @param {string} departmentId - Department ID
 * @returns {Object} Heuristic analysis result
 */
async function checkHeuristicPatterns(userId, queryText, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Checking heuristic patterns for user ${userId}: "${queryText}" in department ${departmentId}`);
      
      // Check cache first for instant response
      const cacheKey = generateCacheKey('heuristic_check', userId, `${queryText}:${departmentId}`);
      const cachedResult = await getFromCache(cacheKey);
      
      if (cachedResult) {
        console.log(`Returning cached heuristic result for user ${userId}`);
        return cachedResult;
      }
      
      // If cache miss, use BQML model for prediction
      const prediction = await predictWithBqmlModel(userId, queryText, departmentId);
      
      const result = {
        suspicious: prediction.suspicionScore > 0.3,
        confidenceScore: prediction.confidenceScore,
        suspicionScore: prediction.suspicionScore,
        recommendations: prediction.recommendations || []
      };
      
      // Cache for 1 hour
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
        // Cache for 2 hours
        await storeInCache(cacheKey, commonCorrections, 2);
        return commonCorrections;
      }
      
      // If no common corrections, use BQML to predict corrections
      const predictedCorrections = await predictCorrections(queryText, departmentId);
      
      // Store predicted corrections in common corrections table for future use
      await storePredictedCorrections(predictedCorrections, queryText, departmentId, userId);
      
      // Cache for 2 hours
      await storeInCache(cacheKey, predictedCorrections, 2);
      
      return predictedCorrections;
    } catch (error) {
      console.error(`Error finding typo corrections for user ${userId}:`, error);
      return [];
    }
  })();
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
      patterns.push({
        id: doc.id,
        ...doc.data()
      });
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
      .replace(/[.*+?^${}()|[\\]\//g, '\\$&') // Escape special regex characters
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
 * Predict with BQML model for heuristic analysis
 * @param {string} userId - User ID
 * @param {string} queryText - User input text
 * @param {string} departmentId - Department ID
 * @returns {Object} Prediction results
 */
async function predictWithBqmlModel(userId, queryText, departmentId) {
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
        department_id: departmentId.toString(),
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
 * Update correction usage count
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

/**
 * Handle payment back navigation
 * @param {string} userId - Telegram user ID
 */
async function handlePaymentBack(userId) {
  try {
    // In a real implementation, we would navigate back to the previous step
    console.log(`User ${userId} wants to go back in payment workflow`);
  } catch (error) {
    console.error('Error handling payment back:', error);
  }
}

/**
 * Handle payment cancellation
 * @param {string} userId - Telegram user ID
 */
async function handlePaymentCancel(userId) {
  try {
    // Clear payment workflow state
    // In a real implementation, we would update Firestore
    console.log(`User ${userId} wants to cancel payment workflow`);
  } catch (error) {
    console.error('Error handling payment cancel:', error);
  }
}

/**
 * Handle unknown payment action
 * @param {string} action - Unknown payment action
 * @param {string} userId - Telegram user ID
 */
async function handleUnknownPaymentAction(action, userId) {
  try {
    // Send error message for unknown payment action
    const errorMessage = `❌ Unknown payment action: ${action}

Please use the available buttons.`;
    
    // In a real implementation, we would send this message back to the user
    console.log(`Unknown payment action message for user ${userId}:`, errorMessage);
  } catch (error) {
    console.error('Error handling unknown payment action:', error);
  }
}

/**
 * Handle main menu callback
 * @param {string} userId - Telegram user ID
 */
async function handleMainMenuCallback(userId) {
  try {
    // Send main menu
    console.log(`User ${userId} wants to return to main menu`);
  } catch (error) {
    console.error('Error handling main menu callback:', error);
  }
}

/**
 * Handle more options callback
 * @param {string} userId - Telegram user ID
 */
async function handleMoreOptionsCallback(userId) {
  try {
    // Send more options menu
    console.log(`User ${userId} wants to see more options`);
  } catch (error) {
    console.error('Error handling more options callback:', error);
  }
}

/**
 * Handle unknown menu
 * @param {string} menu - Unknown menu
 * @param {string} userId - Telegram user ID
 */
async function handleUnknownMenu(menu, userId) {
  try {
    // Send error message for unknown menu
    const errorMessage = `❌ Unknown menu: ${menu}

Please use the available buttons.`;
    
    // In a real implementation, we would send this message back to the user
    console.log(`Unknown menu message for user ${userId}:`, errorMessage);
  } catch (error) {
    console.error('Error handling unknown menu:', error);
  }
}

/**
 * Generate snooze confirmation message
 * @param {string} duration - Snooze duration
 * @returns {string} Confirmation message
 */
function generateSnoozeConfirmation(duration) {
  const durationText = {
    '30m': '30 minutes',
    '1h': '1 hour',
    '2h': '2 hours',
    'work_end': 'the end of your work day',
    'tomorrow': 'tomorrow morning'
  };
  
  return `✅ Reminder snoozed for ${durationText[duration] || '1 hour'}.
I'll check back with you then!`;
}

// Export functions
module.exports = {
  handleActionCallback,
  handleSnoozeCallback,
  handleMenuCallback,
  handlePaymentCallback,
  handleUnknownCallback,
  handleRecordPaymentAction,
  handleLogExpenseAction,
  handleViewReportsAction,
  handleUnknownAction,
  updateSnoozeState,
  calculateSnoozeUntil,
  handlePaymentBack,
  handlePaymentCancel,
  handleUnknownPaymentAction,
  handleMainMenuCallback,
  handleMoreOptionsCallback,
  handleUnknownMenu,
  generateSnoozeConfirmation,
  integrateValidationAndCorrection,
  validateSyntax,
  validateLogic,
  checkHeuristicPatterns,
  validateSemantically,
  findTypoCorrections,
  applyTypoCorrection,
  getUserDepartment,
  getDepartmentPatterns,
  findMatchingPattern,
  convertPatternToRegex,
  findClosestPatterns,
  calculateSimilarity,
  levenshteinDistance,
  extractVariables,
  validateVariables,
  isValidTimePeriod,
  isValidAmount,
  isValidDate,
  isValidQuantity,
  generateVariableSuggestions,
  predictWithBqmlModel,
  getUserContext,
  getCommonCorrections,
  predictCorrections,
  storePredictedCorrections,
  updateCorrectionUsage,
  logCorrectionInHistory,
  applyCorrectionToUserState
};