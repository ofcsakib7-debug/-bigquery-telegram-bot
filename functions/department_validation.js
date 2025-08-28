// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 3
// Component: department_specific_validation_rules
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 16:15 UTC
// Next Step: Implement validation audit workflow
// =============================================

const { Firestore } = require('@google-cloud/firestore');
const { BigQuery } = require('@google-cloud/bigquery');
const { getFromCache, storeInCache, generateCacheKey } = require('../bigquery/cache');
const { withErrorHandling } = require('./error_handling');

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
 * Get department-specific validation rules
 * @param {string} departmentId - Department ID
 * @returns {Object} Department-specific validation rules
 */
async function getDepartmentValidationRules(departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Getting validation rules for department: ${departmentId}`);
      
      // Check cache first
      const cacheKey = generateCacheKey('validation', 'rules', departmentId);
      const cachedRules = await getFromCache(cacheKey);
      
      if (cachedRules) {
        console.log(`Using cached validation rules for department: ${departmentId}`);
        return cachedRules;
      }
      
      // Get rules from BigQuery
      const rules = await loadDepartmentValidationRules(departmentId);
      
      // Cache for 2 hours
      await storeInCache(cacheKey, rules, 2);
      
      return rules;
    } catch (error) {
      console.error(`Error getting validation rules for department ${departmentId}:`, error);
      return getDefaultValidationRules(departmentId);
    }
  })();
}

/**
 * Load department-specific validation rules from BigQuery
 * @param {string} departmentId - Department ID
 * @returns {Object} Validation rules
 */
async function loadDepartmentValidationRules(departmentId) {
  try {
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Query department-specific validation rules
    const query = `
      SELECT 
        pattern,
        regex_pattern,
        description,
        priority_score
      FROM \`${datasetId}.department_validation_rules\`
      WHERE 
        department_id = @departmentId
      ORDER BY priority_score DESC
      LIMIT 100
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: {
        departmentId: departmentId.toString()
      }
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const rules = {
      departmentId: departmentId.toString(),
      patterns: rows.map(row => ({
        pattern: row.pattern,
        regexPattern: row.regex_pattern,
        description: row.description,
        priorityScore: parseFloat(row.priority_score) || 0.5
      })),
      timestamp: new Date().toISOString()
    };
    
    return rules;
  } catch (error) {
    console.error(`Error loading validation rules for department ${departmentId}:`, error);
    return {
      departmentId: departmentId.toString(),
      patterns: [],
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get default validation rules for a department
 * @param {string} departmentId - Department ID
 * @returns {Object} Default validation rules
 */
function getDefaultValidationRules(departmentId) {
  try {
    console.log(`Using default validation rules for department: ${departmentId}`);
    
    const defaultRules = {
      ACCOUNTING: {
        patterns: [
          { pattern: 'e', regexPattern: '^[a-z0-9\\s{}]*$', description: 'expenses', priorityScore: 0.95 },
          { pattern: 'p', regexPattern: '^[a-z0-9\\s{}]*$', description: 'payments', priorityScore: 0.92 },
          { pattern: 'v', regexPattern: '^[a-z0-9\\s{}]*$', description: 'vouchers', priorityScore: 0.88 },
          { pattern: 'b', regexPattern: '^[a-z0-9\\s{}]*$', description: 'bank reconciliation', priorityScore: 0.85 },
          { pattern: 'r', regexPattern: '^[a-z0-9\\s{}]*$', description: 'revenue report', priorityScore: 0.82 },
          { pattern: 'a', regexPattern: '^[a-z0-9\\s{}]*$', description: 'audit trail', priorityScore: 0.78 },
          { pattern: 'f', regexPattern: '^[a-z0-9\\s{}]*$', description: 'financial summary', priorityScore: 0.75 },
          { pattern: 'c', regexPattern: '^[a-z0-9\\s{}]*$', description: 'cash flow', priorityScore: 0.72 },
          { pattern: 'cm', regexPattern: '^(cm|lm|ly|lw|tw)$', description: 'current month', priorityScore: 0.97 },
          { pattern: 'pd', regexPattern: '^(pd|pa|un|vp)$', description: 'payment due', priorityScore: 0.85 },
          { pattern: 'vp', regexPattern: '^(vp|vs|hi)$', description: 'voucher pending', priorityScore: 0.75 }
        ]
      },
      
      SALES: {
        patterns: [
          { pattern: 'dlv', regexPattern: '^[a-z0-9\\s{}]*$', description: 'delivery', priorityScore: 0.95 },
          { pattern: 'chln', regexPattern: '^[a-z0-9\\s{}]*$', description: 'challan', priorityScore: 0.92 },
          { pattern: 'pend', regexPattern: '^[a-z0-9\\s{}]*$', description: 'pending', priorityScore: 0.88 },
          { pattern: 'cust', regexPattern: '^[a-z0-9\\s{}]*$', description: 'customer', priorityScore: 0.85 },
          { pattern: 'pay', regexPattern: '^[a-z0-9\\s{}]*$', description: 'payment', priorityScore: 0.82 },
          { pattern: 'stk', regexPattern: '^[a-z0-9\\s{}]*$', description: 'stock', priorityScore: 0.78 },
          { pattern: 'lvl', regexPattern: '^[a-z0-9\\s{}]*$', description: 'level', priorityScore: 0.75 },
          { pattern: 'cat', regexPattern: '^[a-z0-9\\s{}]*$', description: 'category', priorityScore: 0.72 },
          { pattern: 'cm', regexPattern: '^(cm|lm|ly|lw|tw)$', description: 'current month', priorityScore: 0.97 },
          { pattern: 'tw', regexPattern: '^(tw|lw|cw|nw)$', description: 'this week', priorityScore: 0.85 },
          { pattern: 'del', regexPattern: '^(del|pick|ship|recv)$', description: 'delivery status', priorityScore: 0.75 }
        ]
      },
      
      INVENTORY: {
        patterns: [
          { pattern: 'mach', regexPattern: '^[a-z0-9\\s{}]*$', description: 'machine', priorityScore: 0.95 },
          { pattern: 'mdl', regexPattern: '^[a-z0-9\\s{}]*$', description: 'model', priorityScore: 0.92 },
          { pattern: 'stk', regexPattern: '^[a-z0-9\\s{}]*$', description: 'stock', priorityScore: 0.88 },
          { pattern: 'low', regexPattern: '^[a-z0-9\\s{}]*$', description: 'low', priorityScore: 0.85 },
          { pattern: 'qty', regexPattern: '^[a-z0-9\\s{}]*$', description: 'quantity', priorityScore: 0.82 },
          { pattern: 'alrt', regexPattern: '^[a-z0-9\\s{}]*$', description: 'alert', priorityScore: 0.78 },
          { pattern: 'prt', regexPattern: '^[a-z0-9\\s{}]*$', description: 'part', priorityScore: 0.75 },
          { pattern: 'avl', regexPattern: '^[a-z0-9\\s{}]*$', description: 'available', priorityScore: 0.72 },
          { pattern: 'srch', regexPattern: '^[a-z0-9\\s{}]*$', description: 'search', priorityScore: 0.68 },
          { pattern: 'cm', regexPattern: '^(cm|lm|ly|lw|tw)$', description: 'current month', priorityScore: 0.97 },
          { pattern: 'stk', regexPattern: '^(stk|inv|wh|br)$', description: 'stock type', priorityScore: 0.75 }
        ]
      },
      
      SERVICE: {
        patterns: [
          { pattern: 'open', regexPattern: '^[a-z0-9\\s{}]*$', description: 'open', priorityScore: 0.95 },
          { pattern: 'srv', regexPattern: '^[a-z0-9\\s{}]*$', description: 'service', priorityScore: 0.92 },
          { pattern: 'tkt', regexPattern: '^[a-z0-9\\s{}]*$', description: 'ticket', priorityScore: 0.88 },
          { pattern: 'tech', regexPattern: '^[a-z0-9\\s{}]*$', description: 'technician', priorityScore: 0.85 },
          { pattern: 'sched', regexPattern: '^[a-z0-9\\s{}]*$', description: 'schedule', priorityScore: 0.82 },
          { pattern: 'mnt', regexPattern: '^[a-z0-9\\s{}]*$', description: 'maintenance', priorityScore: 0.78 },
          { pattern: 'due', regexPattern: '^[a-z0-9\\s{}]*$', description: 'due', priorityScore: 0.75 },
          { pattern: 'soon', regexPattern: '^[a-z0-9\\s{}]*$', description: 'soon', priorityScore: 0.72 },
          { pattern: 'cm', regexPattern: '^(cm|lm|ly|lw|tw)$', description: 'current month', priorityScore: 0.97 },
          { pattern: 'high', regexPattern: '^(high|med|low|crit)$', description: 'priority', priorityScore: 0.85 },
          { pattern: 'tick', regexPattern: '^(tick|serv|rep|fix)$', description: 'ticket type', priorityScore: 0.75 }
        ]
      },
      
      MARKETING: {
        patterns: [
          { pattern: 'cust', regexPattern: '^[a-z0-9\\s{}]*$', description: 'customer', priorityScore: 0.95 },
          { pattern: 'acq', regexPattern: '^[a-z0-9\\s{}]*$', description: 'acquisition', priorityScore: 0.92 },
          { pattern: 'rate', regexPattern: '^[a-z0-9\\s{}]*$', description: 'rate', priorityScore: 0.88 },
          { pattern: 'fact', regexPattern: '^[a-z0-9\\s{}]*$', description: 'factory', priorityScore: 0.85 },
          { pattern: 'vst', regexPattern: '^[a-z0-9\\s{}]*$', description: 'visit', priorityScore: 0.82 },
          { pattern: 'sch', regexPattern: '^[a-z0-9\\s{}]*$', description: 'schedule', priorityScore: 0.78 },
          { pattern: 'lead', regexPattern: '^[a-z0-9\\s{}]*$', description: 'lead', priorityScore: 0.75 },
          { pattern: 'conv', regexPattern: '^[a-z0-9\\s{}]*$', description: 'conversion', priorityScore: 0.72 },
          { pattern: 'stat', regexPattern: '^[a-z0-9\\s{}]*$', description: 'stats', priorityScore: 0.68 },
          { pattern: 'cm', regexPattern: '^(cm|lm|ly|lw|tw)$', description: 'current month', priorityScore: 0.97 },
          { pattern: 'quot', regexPattern: '^(quot|price|deal|offer)$', description: 'quote type', priorityScore: 0.75 }
        ]
      }
    };
    
    return {
      departmentId: departmentId.toString(),
      patterns: defaultRules[departmentId] || [],
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error getting default validation rules for department ${departmentId}:`, error);
    return {
      departmentId: departmentId.toString(),
      patterns: [],
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Validate query text against department-specific rules
 * @param {string} userId - User ID
 * @param {string} queryText - Query text
 * @param {string} departmentId - Department ID
 * @returns {Object} Validation result
 */
async function validateDepartmentQuery(userId, queryText, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Validating query for user ${userId} in department ${departmentId}: "${queryText}"`);
      
      // Get department-specific validation rules
      const validationRules = await getDepartmentValidationRules(departmentId);
      
      if (!validationRules || !validationRules.patterns || validationRules.patterns.length === 0) {
        return {
          valid: false,
          errorType: 'VALIDATION',
          errorMessage: `No validation rules found for department ${departmentId}`,
          suggestions: [`Contact administrator to set up ${departmentId} validation rules`]
        };
      }
      
      // Check if query matches any valid pattern
      const patternMatch = findMatchingPattern(queryText, validationRules.patterns);
      
      if (!patternMatch) {
        // Find closest matching patterns for suggestions
        const suggestions = findClosestPatterns(queryText, validationRules.patterns);
        return {
          valid: false,
          errorType: 'VALIDATION',
          errorMessage: `Invalid search pattern for ${departmentId} department.`,
          suggestions: suggestions
        };
      }
      
      // Query passed validation
      return {
        valid: true,
        errorType: null,
        errorMessage: null,
        suggestions: [],
        matchedPattern: patternMatch
      };
    } catch (error) {
      console.error(`Error validating department query for user ${userId}:`, error);
      return {
        valid: false,
        errorType: 'VALIDATION',
        errorMessage: 'Error validating query against department rules',
        suggestions: ['Try a different query format']
      };
    }
  })();
}

/**
 * Find matching pattern for query text
 * @param {string} queryText - Query text
 * @param {Array} patterns - Validation patterns
 * @returns {Object|null} Matching pattern or null
 */
function findMatchingPattern(queryText, patterns) {
  try {
    // Check if query matches any valid pattern
    for (const pattern of patterns) {
      try {
        const regex = new RegExp(pattern.regexPattern, 'i');
        if (regex.test(queryText)) {
          return pattern;
        }
      } catch (regexError) {
        console.error(`Error testing regex pattern ${pattern.pattern}:`, regexError);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding matching pattern:', error);
    return null;
  }
}

/**
 * Find closest matching patterns for suggestions
 * @param {string} queryText - Query text
 * @param {Array} patterns - Validation patterns
 * @returns {Array} Closest matching patterns
 */
function findClosestPatterns(queryText, patterns) {
  try {
    // Calculate similarity scores for all patterns
    const scoredPatterns = patterns.map(pattern => {
      const similarity = calculatePatternSimilarity(queryText, pattern.pattern);
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
        `Try: "${pattern.pattern}" (${pattern.description})`
      );
  } catch (error) {
    console.error('Error finding closest patterns:', error);
    return [];
  }
}

/**
 * Calculate similarity between query text and pattern
 * @param {string} queryText - Query text
 * @param {string} patternText - Pattern text
 * @returns {number} Similarity score (0-1)
 */
function calculatePatternSimilarity(queryText, patternText) {
  try {
    // Simple character overlap calculation
    const queryChars = new Set(queryText.toLowerCase().split(''));
    const patternChars = new Set(patternText.toLowerCase().split(''));
    
    // Count overlapping characters
    let overlapCount = 0;
    for (const char of queryChars) {
      if (patternChars.has(char)) {
        overlapCount++;
      }
    }
    
    // Calculate similarity as ratio of overlapping characters to total unique characters
    const totalUniqueChars = new Set([...queryChars, ...patternChars]).size;
    const similarity = totalUniqueChars > 0 ? overlapCount / totalUniqueChars : 0;
    
    return similarity;
  } catch (error) {
    console.error('Error calculating pattern similarity:', error);
    return 0;
  }
}

/**
 * Validate time period format
 * @param {string} timePeriod - Time period text
 * @param {string} departmentId - Department ID
 * @returns {Object} Validation result
 */
async function validateTimePeriod(timePeriod, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Validating time period for department ${departmentId}: "${timePeriod}"`);
      
      // Get department-specific validation rules
      const validationRules = await getDepartmentValidationRules(departmentId);
      
      // Find time period patterns
      const timePeriodPatterns = validationRules.patterns.filter(p => 
        p.regexPattern && p.regexPattern.includes('(cm|lm|ly|lw|tw)')
      );
      
      if (timePeriodPatterns.length === 0) {
        // Use default time periods
        const validTimePeriods = ['cm', 'lm', 'lw', 'tw', 'ly'];
        const isValid = validTimePeriods.includes(timePeriod.toLowerCase());
        
        return {
          valid: isValid,
          errorType: isValid ? null : 'VALIDATION',
          errorMessage: isValid ? null : `Invalid time period: ${timePeriod}`,
          suggestions: isValid ? [] : [
            'cm = current month',
            'lm = last month',
            'lw = last week',
            'tw = this week',
            'ly = last year'
          ]
        };
      }
      
      // Validate against department-specific patterns
      const isValid = timePeriodPatterns.some(pattern => {
        try {
          const regex = new RegExp(pattern.regexPattern, 'i');
          return regex.test(timePeriod);
        } catch (regexError) {
          console.error(`Error testing time period regex ${pattern.regexPattern}:`, regexError);
          return false;
        }
      });
      
      return {
        valid: isValid,
        errorType: isValid ? null : 'VALIDATION',
        errorMessage: isValid ? null : `Invalid time period for ${departmentId}: ${timePeriod}`,
        suggestions: isValid ? [] : [
          'cm = current month',
          'lm = last month',
          'lw = last week',
          'tw = this week',
          'ly = last year'
        ]
      };
    } catch (error) {
      console.error(`Error validating time period for department ${departmentId}:`, error);
      return {
        valid: false,
        errorType: 'VALIDATION',
        errorMessage: 'Error validating time period',
        suggestions: [
          'cm = current month',
          'lm = last month',
          'lw = last week',
          'tw = this week',
          'ly = last year'
        ]
      };
    }
  })();
}

/**
 * Validate variable constraints for a department
 * @param {Object} variables - Extracted variables
 * @param {string} departmentId - Department ID
 * @returns {Array} Validation errors
 */
async function validateDepartmentVariables(variables, departmentId) {
  return await withErrorHandling(async () => {
    try {
      console.log(`Validating variables for department ${departmentId}:`, variables);
      
      const errors = [];
      
      // Validate each variable based on department rules
      for (const [varName, varValue] of Object.entries(variables)) {
        switch (varName) {
          case 'time':
            if (varValue) {
              const timeValidation = await validateTimePeriod(varValue, departmentId);
              if (!timeValidation.valid) {
                errors.push(`Time period '${varValue}' is invalid: ${timeValidation.errorMessage}`);
              }
            }
            break;
          case 'amount':
            if (varValue && !isValidAmount(varValue)) {
              errors.push(`Amount '${varValue}' is invalid`);
            }
            break;
          case 'date':
            if (varValue && !isValidDate(varValue)) {
              errors.push(`Date '${varValue}' is invalid`);
            }
            break;
          case 'quantity':
            if (varValue && !isValidQuantity(varValue)) {
              errors.push(`Quantity '${varValue}' is invalid`);
            }
            break;
          default:
            // Generic validation for other variables
            if (varValue && !isValidGenericVariable(varValue)) {
              errors.push(`Variable '${varName}' with value '${varValue}' contains invalid characters`);
            }
            break;
        }
      }
      
      return errors;
    } catch (error) {
      console.error(`Error validating department variables for ${departmentId}:`, error);
      return [`Error validating variables for ${departmentId}`];
    }
  })();
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
 * Check if generic variable is valid
 * @param {string} variable - Variable
 * @returns {boolean} True if valid
 */
function isValidGenericVariable(variable) {
  try {
    const variableRegex = /^[a-zA-Z0-9\\s\\-]+$/;
    return variableRegex.test(variable);
  } catch (error) {
    console.error('Error validating generic variable:', error);
    return false;
  }
}

/**
 * Generate department-specific suggestions
 * @param {Array} patterns - Department patterns
 * @param {string} departmentId - Department ID
 * @returns {Array} Suggestions
 */
function generateDepartmentSuggestions(patterns, departmentId) {
  try {
    if (!patterns || patterns.length === 0) {
      return [];
    }
    
    // Sort patterns by priority score
    const sortedPatterns = patterns.sort((a, b) => b.priorityScore - a.priorityScore);
    
    // Take top 5 patterns
    const topPatterns = sortedPatterns.slice(0, 5);
    
    // Generate suggestions
    const suggestions = topPatterns.map(pattern => 
      `Try: "${pattern.pattern}" (${pattern.description})`
    );
    
    return suggestions;
  } catch (error) {
    console.error(`Error generating department suggestions for ${departmentId}:`, error);
    return [];
  }
}

// Export functions
module.exports = {
  getDepartmentValidationRules,
  loadDepartmentValidationRules,
  getDefaultValidationRules,
  validateDepartmentQuery,
  findMatchingPattern,
  findClosestPatterns,
  calculatePatternSimilarity,
  validateTimePeriod,
  validateDepartmentVariables,
  isValidAmount,
  isValidDate,
  isValidQuantity,
  isValidGenericVariable,
  generateDepartmentSuggestions
};