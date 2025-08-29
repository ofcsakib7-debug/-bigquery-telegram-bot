/**
 * Quota-Saving Implementation
 * 
 * This module implements the quota-saving requirements
 * as specified in Design 8.
 */

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Execute a query with quota-saving measures
 * @param {string} query - SQL query to execute
 * @param {Object} params - Query parameters
 * @param {Object} options - Additional options
 * @returns {Array} Query results
 */
async function executeQuotaSavingQuery(query, params = {}, options = {}) {
  try {
    // Apply quota-saving measures:
    // 1. Always filter by partitioning column first
    // 2. Always include at least one clustering column in WHERE clause
    // 3. Use approximate functions where exact counts aren't needed
    
    const queryOptions = {
      query: query,
      location: 'US',
      params: params,
      maximumBytesBilled: options.maximumBytesBilled || process.env.BIGQUERY_MAX_BYTES_BILLED || '100000000' // 100MB default
    };
    
    // Add labels for quota monitoring
    if (options.labels) {
      queryOptions.labels = options.labels;
    }
    
    const [job] = await bigquery.createQueryJob(queryOptions);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error executing quota-saving query:', error);
    throw error;
  }
}

/**
 * Get approximate count using APPROX_COUNT_DISTINCT
 * @param {string} table - Table name
 * @param {string} column - Column name
 * @param {Object} filters - Filter conditions
 * @returns {number} Approximate count
 */
async function getApproximateCount(table, column, filters = {}) {
  try {
    let whereClause = '';
    const params = {};
    
    if (Object.keys(filters).length > 0) {
      const conditions = [];
      for (const [key, value] of Object.entries(filters)) {
        conditions.push(`${key} = @${key}`);
        params[key] = value;
      }
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }
    
    const query = `
      SELECT APPROX_COUNT_DISTINCT(${column}) as approximate_count
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.${table}\`
      ${whereClause}
    `;
    
    const rows = await executeQuotaSavingQuery(query, params, {
      maximumBytesBilled: '10000000', // 10MB
      labels: { query_type: 'approximate_count' }
    });
    
    return rows[0].approximate_count;
  } catch (error) {
    console.error('Error getting approximate count:', error);
    return 0;
  }
}

/**
 * Get approximate quantiles using APPROX_QUANTILES
 * @param {string} table - Table name
 * @param {string} column - Column name
 * @param {number} numQuantiles - Number of quantiles
 * @param {Object} filters - Filter conditions
 * @returns {Array} Approximate quantiles
 */
async function getApproximateQuantiles(table, column, numQuantiles = 4, filters = {}) {
  try {
    let whereClause = '';
    const params = {};
    
    if (Object.keys(filters).length > 0) {
      const conditions = [];
      for (const [key, value] of Object.entries(filters)) {
        conditions.push(`${key} = @${key}`);
        params[key] = value;
      }
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }
    
    const query = `
      SELECT APPROX_QUANTILES(${column}, ${numQuantiles}) as quantiles
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.${table}\`
      ${whereClause}
    `;
    
    const rows = await executeQuotaSavingQuery(query, params, {
      maximumBytesBilled: '10000000', // 10MB
      labels: { query_type: 'approximate_quantiles' }
    });
    
    return rows[0].quantiles;
  } catch (error) {
    console.error('Error getting approximate quantiles:', error);
    return [];
  }
}

/**
 * Validate data with CHECK constraints
 * @param {string} table - Table name
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateDataWithConstraints(table, data) {
  try {
    // Apply CHECK constraints for critical fields
    switch (table) {
      case 'command_patterns':
        return validateCommandPatternsData(data);
      
      case 'prelisted_items':
        return validatePrelistedItemsData(data);
      
      case 'contextual_actions':
        return validateContextualActionsData(data);
      
      default:
        return { valid: true };
    }
  } catch (error) {
    console.error('Error validating data with constraints:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate command patterns data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateCommandPatternsData(data) {
  try {
    // pattern_id must follow exact format: PATTERN-DEPT-TYPE-ABC
    if (data.pattern_id && !/^PATTERN-[A-Z]+-[A-Z]+-[A-Z0-9]{3}$/.test(data.pattern_id)) {
      return { 
        valid: false, 
        error: 'Invalid pattern_id format',
        expectedFormat: 'PATTERN-DEPT-TYPE-ABC'
      };
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating command patterns data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate prelisted items data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validatePrelistedItemsData(data) {
  try {
    // item_id must follow exact format: ITEM-DEPT-TYPE-ABC
    if (data.item_id && !/^ITEM-[A-Z]+-[A-Z]+-[A-Z0-9]{3}$/.test(data.item_id)) {
      return { 
        valid: false, 
        error: 'Invalid item_id format',
        expectedFormat: 'ITEM-DEPT-TYPE-ABC'
      };
    }
    
    // item_code must be 2-4 alphanumeric characters
    if (data.item_code && !/^[a-z0-9]{2,4}$/.test(data.item_code)) {
      return { 
        valid: false, 
        error: 'Invalid item_code format',
        expectedFormat: '2-4 alphanumeric characters'
      };
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating prelisted items data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate contextual actions data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateContextualActionsData(data) {
  try {
    // action_id must follow exact format: ACTION-DEPT-CONTEXT-ABC
    if (data.action_id && !/^ACTION-[A-Z]+-[A-Z]+-[A-Z0-9]{3}$/.test(data.action_id)) {
      return { 
        valid: false, 
        error: 'Invalid action_id format',
        expectedFormat: 'ACTION-DEPT-CONTEXT-ABC'
      };
    }
    
    // action_data must follow exact format: "ctx:{action_id}:{context_data}"
    if (data.action_data && !/^ctx:[A-Z0-9-]+:.+$/.test(data.action_data)) {
      return { 
        valid: false, 
        error: 'Invalid action_data format',
        expectedFormat: 'ctx:{action_id}:{context_data}'
      };
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating contextual actions data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate pattern format using regex
 * @param {string} pattern - Pattern to validate
 * @returns {boolean} True if valid
 */
function validatePatternFormat(pattern) {
  try {
    // Validate pattern format using regex: /^[a-z0-9]{2,4}=\d{1,2}$/
    return /^[a-z0-9]{2,4}=\d{1,2}$/.test(pattern);
  } catch (error) {
    console.error('Error validating pattern format:', error);
    return false;
  }
}

// Export functions
module.exports = {
  executeQuotaSavingQuery,
  getApproximateCount,
  getApproximateQuantiles,
  validateDataWithConstraints,
  validatePatternFormat
};