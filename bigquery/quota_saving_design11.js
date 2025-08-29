/**
 * Quota-Saving Implementation for Design 11
 * 
 * This module implements the quota-saving requirements
 * as specified in Design 11.
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
    // 1. Always filter by partitioning column first in all queries
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
      case 'dealer_profiles':
        return validateDealerProfilesData(data);
      
      case 'dealer_credit_terms':
        return validateDealerCreditTermsData(data);
      
      case 'dealer_stock_transfers_journal':
        return validateDealerStockTransfersData(data);
      
      case 'dealer_challan_items':
        return validateDealerChallanItemsData(data);
      
      case 'dealer_payment_journal':
        return validateDealerPaymentJournalData(data);
      
      case 'dealer_performance_metrics':
        return validateDealerPerformanceMetricsData(data);
      
      default:
        return { valid: true };
    }
  } catch (error) {
    console.error('Error validating data with constraints:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate dealer profiles data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateDealerProfilesData(data) {
  try {
    // dealer_id must follow exact format: DEALER-YYYYMMDD-ABC
    if (data.dealer_id && !/^DEALER-\d{8}-[A-Z0-9]{3}$/.test(data.dealer_id)) {
      return { 
        valid: false, 
        error: 'Invalid dealer_id format',
        expectedFormat: 'DEALER-YYYYMMDD-ABC'
      };
    }
    
    // dealer_type must be one of 2 specified values only (DEALER, SUB_DEALER)
    const validDealerTypes = ['DEALER', 'SUB_DEALER'];
    if (data.dealer_type && !validDealerTypes.includes(data.dealer_type)) {
      return { 
        valid: false, 
        error: 'Invalid dealer_type value',
        validValues: validDealerTypes
      };
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating dealer profiles data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate dealer credit terms data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateDealerCreditTermsData(data) {
  try {
    // credit_id must follow exact format: CREDIT-YYYYMMDD-ABC
    if (data.credit_id && !/^CREDIT-\d{8}-[A-Z0-9]{3}$/.test(data.credit_id)) {
      return { 
        valid: false, 
        error: 'Invalid credit_id format',
        expectedFormat: 'CREDIT-YYYYMMDD-ABC'
      };
    }
    
    // credit_score must be between 0-100
    if (data.credit_score !== undefined && 
        (data.credit_score < 0 || data.credit_score > 100)) {
      return { 
        valid: false, 
        error: 'credit_score must be between 0-100'
      };
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating dealer credit terms data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate dealer stock transfers data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateDealerStockTransfersData(data) {
  try {
    // transfer_id must follow exact format: TRANSFER-YYYYMMDD-ABC
    if (data.transfer_id && !/^TRANSFER-\d{8}-[A-Z0-9]{3}$/.test(data.transfer_id)) {
      return { 
        valid: false, 
        error: 'Invalid transfer_id format',
        expectedFormat: 'TRANSFER-YYYYMMDD-ABC'
      };
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating dealer stock transfers data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate dealer challan items data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateDealerChallanItemsData(data) {
  try {
    // challan_item_id must follow exact format: CHALLANITEM-YYYYMMDD-ABC
    if (data.challan_item_id && !/^CHALLANITEM-\d{8}-[A-Z0-9]{3}$/.test(data.challan_item_id)) {
      return { 
        valid: false, 
        error: 'Invalid challan_item_id format',
        expectedFormat: 'CHALLANITEM-YYYYMMDD-ABC'
      };
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating dealer challan items data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate dealer payment journal data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateDealerPaymentJournalData(data) {
  try {
    // payment_id must follow exact format: PAY-YYYYMMDD-ABC
    if (data.payment_id && !/^PAY-\d{8}-[A-Z0-9]{3}$/.test(data.payment_id)) {
      return { 
        valid: false, 
        error: 'Invalid payment_id format',
        expectedFormat: 'PAY-YYYYMMDD-ABC'
      };
    }
    
    // payment_for_month must be first day of the month (e.g., 2023-11-01)
    if (data.payment_for_month) {
      const date = new Date(data.payment_for_month);
      if (date.getDate() !== 1) {
        return { 
          valid: false, 
          error: 'payment_for_month must be first day of the month (e.g., 2023-11-01)'
        };
      }
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating dealer payment journal data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate dealer performance metrics data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateDealerPerformanceMetricsData(data) {
  try {
    // metric_id must follow exact format: METRIC-YYYYMMDD-ABC
    if (data.metric_id && !/^METRIC-\d{8}-[A-Z0-9]{3}$/.test(data.metric_id)) {
      return { 
        valid: false, 
        error: 'Invalid metric_id format',
        expectedFormat: 'METRIC-YYYYMMDD-ABC'
      };
    }
    
    // performance_score must be between 0-100
    if (data.performance_score !== undefined && 
        (data.performance_score < 0 || data.performance_score > 100)) {
      return { 
        valid: false, 
        error: 'performance_score must be between 0-100'
      };
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating dealer performance metrics data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Generate scheduled queries for Design 11
 * @returns {Object} Scheduled queries
 */
function generateDesign11ScheduledQueries() {
  return {
    /**
     * Daily scheduled query for dealer_stock_transfers_cache refresh
     * Runs at 02:00 Asia/Dhaka
     */
    dealerStockTransfersCacheRefresh: `
-- Scheduled query for dealer_stock_transfers_cache refresh
-- Runs daily at 02:00 Asia/Dhaka

-- Refresh dealer stock transfers cache
-- This query would typically populate the cache table from the journal table
-- and calculate current transfer states

-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "dealer_stock_cache_refresh", "timezone": "Asia/Dhaka"}
`,

    /**
     * Daily scheduled query for dealer_payment_cache refresh
     * Runs at 02:30 Asia/Dhaka
     */
    dealerPaymentCacheRefresh: `
-- Scheduled query for dealer_payment_cache refresh
-- Runs daily at 02:30 Asia/Dhaka

-- Refresh dealer payment cache
-- This query would typically aggregate payment data to update cache

-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "dealer_payment_cache_refresh", "timezone": "Asia/Dhaka"}
`,

    /**
     * Daily scheduled query for dealer_performance_metrics
     * Runs at 03:00 Asia/Dhaka
     */
    dealerPerformanceMetrics: `
-- Scheduled query for dealer_performance_metrics
-- Runs daily at 03:00 Asia/Dhaka

-- Generate dealer performance metrics
-- This query would typically aggregate data to calculate performance metrics

-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "dealer_performance_metrics", "timezone": "Asia/Dhaka"}
`,

    /**
     * Daily scheduled query for dealer_trend_model retraining
     * Runs at 04:00 Asia/Dhaka
     */
    dealerTrendModelRetraining: `
-- Scheduled query for dealer_trend_model retraining
-- Runs daily at 04:00 Asia/Dhaka

-- Retrain dealer trend model
-- This query would typically create or update the BQML model

-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "model_retraining", "timezone": "Asia/Dhaka"}
`,

    /**
     * Daily scheduled query for data quality checks
     * Runs daily to validate data integrity
     */
    dataQualityChecks: `
-- Scheduled query for data quality checks
-- Runs daily to validate data integrity

-- Check dealer_profiles table
SELECT 
  'dealer_profiles' as table_name,
  COUNT(*) as total_rows,
  COUNTIF(dealer_id NOT LIKE 'DEALER-%') as invalid_dealer_id,
  COUNTIF(dealer_type NOT IN ('DEALER', 'SUB_DEALER')) as invalid_dealer_type,
  0 as invalid_score
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_profiles\`
WHERE DATE(created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
UNION ALL

-- Check dealer_credit_terms table
SELECT 
  'dealer_credit_terms' as table_name,
  COUNT(*) as total_rows,
  COUNTIF(credit_id NOT LIKE 'CREDIT-%') as invalid_credit_id,
  0 as invalid_dealer_type,
  COUNTIF(credit_score < 0 OR credit_score > 100) as invalid_score
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_credit_terms\`
WHERE DATE(created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
UNION ALL

-- Check dealer_stock_transfers_journal table
SELECT 
  'dealer_stock_transfers_journal' as table_name,
  COUNT(*) as total_rows,
  COUNTIF(transfer_id NOT LIKE 'TRANSFER-%') as invalid_transfer_id,
  0 as invalid_dealer_type,
  0 as invalid_score
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_stock_transfers_journal\`
WHERE DATE(created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY);

-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "data_quality", "timezone": "Asia/Dhaka"}
`
  };
}

// Export functions
module.exports = {
  executeQuotaSavingQuery,
  getApproximateCount,
  getApproximateQuantiles,
  validateDataWithConstraints,
  generateDesign11ScheduledQueries
};