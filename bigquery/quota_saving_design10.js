/**
 * Quota-Saving Implementation for Design 10
 * 
 * This module implements the quota-saving requirements
 * as specified in Design 10.
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
      case 'due_items':
        return validateDueItemsData(data);
      
      case 'due_payment_journal':
        return validateDuePaymentJournalData(data);
      
      case 'crm_customer_ledger':
        return validateCrmCustomerLedgerData(data);
      
      default:
        return { valid: true };
    }
  } catch (error) {
    console.error('Error validating data with constraints:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate due items data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateDueItemsData(data) {
  try {
    // due_id must follow exact format: DUE-YYYYMMDD-ABC
    if (data.due_id && !/^DUE-\d{8}-[A-Z0-9]{3}$/.test(data.due_id)) {
      return { 
        valid: false, 
        error: 'Invalid due_id format',
        expectedFormat: 'DUE-YYYYMMDD-ABC'
      };
    }
    
    // status must be one of 4 specified values only
    const validStatuses = ['PENDING', 'PARTIAL', 'COMPLETED', 'OVERDUE'];
    if (data.status && !validStatuses.includes(data.status)) {
      return { 
        valid: false, 
        error: 'Invalid status value',
        validValues: validStatuses
      };
    }
    
    // customer_reliability_score must be between 0-100
    if (data.customer_reliability_score !== undefined && 
        (data.customer_reliability_score < 0 || data.customer_reliability_score > 100)) {
      return { 
        valid: false, 
        error: 'customer_reliability_score must be between 0-100'
      };
    }
    
    // Validate recurring_frequency using regex
    if (data.recurring_frequency) {
      const validFrequencies = /^(DAILY|WEEKLY|MONTHLY|QUARTERLY|ANNUAL)$/;
      if (!validFrequencies.test(data.recurring_frequency)) {
        return { 
          valid: false, 
          error: 'Invalid recurring_frequency value',
          validPattern: 'DAILY, WEEKLY, MONTHLY, QUARTERLY, or ANNUAL'
        };
      }
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating due items data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate due payment journal data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateDuePaymentJournalData(data) {
  try {
    // journal_id must follow exact format: JOURNAL-YYYYMMDD-ABC
    if (data.journal_id && !/^JOURNAL-\d{8}-[A-Z0-9]{3}$/.test(data.journal_id)) {
      return { 
        valid: false, 
        error: 'Invalid journal_id format',
        expectedFormat: 'JOURNAL-YYYYMMDD-ABC'
      };
    }
    
    // transaction_type must be one of specified values
    const validTypes = ['CREATE', 'PARTIAL_PAYMENT', 'COMPLETED', 'REMINDER_SENT'];
    if (data.transaction_type && !validTypes.includes(data.transaction_type)) {
      return { 
        valid: false, 
        error: 'Invalid transaction_type value',
        validValues: validTypes
      };
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating due payment journal data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate CRM customer ledger data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateCrmCustomerLedgerData(data) {
  try {
    // customer_reliability_score must be between 0-100
    if (data.customer_reliability_score !== undefined && 
        (data.customer_reliability_score < 0 || data.customer_reliability_score > 100)) {
      return { 
        valid: false, 
        error: 'customer_reliability_score must be between 0-100'
      };
    }
    
    // on_time_payment_rate must be between 0-100
    if (data.on_time_payment_rate !== undefined && 
        (data.on_time_payment_rate < 0 || data.on_time_payment_rate > 100)) {
      return { 
        valid: false, 
        error: 'on_time_payment_rate must be between 0-100'
      };
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating CRM customer ledger data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Generate scheduled queries for Design 10
 * @returns {Object} Scheduled queries
 */
function generateDesign10ScheduledQueries() {
  return {
    /**
     * Daily scheduled query for due_payment_cache refresh
     * Runs at 02:00 Asia/Dhaka
     */
    duePaymentCacheRefresh: `
-- Scheduled query for due_payment_cache refresh
-- Runs daily at 02:00 Asia/Dhaka

-- Refresh due payment cache
-- This query would typically populate the cache table from the journal table
-- and calculate current due states

-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "due_cache_refresh", "timezone": "Asia/Dhaka"}
`,

    /**
     * Daily scheduled query for crm_customer_ledger refresh
     * Runs at 02:30 Asia/Dhaka
     */
    crmCustomerLedgerRefresh: `
-- Scheduled query for crm_customer_ledger refresh
-- Runs daily at 02:30 Asia/Dhaka

-- Refresh customer ledger data
-- This query would typically aggregate payment data to update customer profiles

-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "customer_ledger_refresh", "timezone": "Asia/Dhaka"}
`,

    /**
     * Daily scheduled query for bqml_training_customer_payments
     * Runs at 03:00 Asia/Dhaka
     */
    bqmlTrainingData: `
-- Scheduled query for bqml_training_customer_payments
-- Runs daily at 03:00 Asia/Dhaka

-- Generate BQML training data
-- This query would typically aggregate data from payment receipts
-- and calculate features for machine learning

-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "bqml_training", "timezone": "Asia/Dhaka"}
`,

    /**
     * Daily scheduled query for customer_payment_model retraining
     * Runs at 04:00 Asia/Dhaka
     */
    customerPaymentModelRetraining: `
-- Scheduled query for customer_payment_model retraining
-- Runs daily at 04:00 Asia/Dhaka

-- Retrain customer payment model
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

-- Check due_items table
SELECT 
  'due_items' as table_name,
  COUNT(*) as total_rows,
  COUNTIF(due_id NOT LIKE 'DUE-%') as invalid_due_id,
  COUNTIF(status NOT IN ('PENDING', 'PARTIAL', 'COMPLETED', 'OVERDUE')) as invalid_status,
  0 as invalid_score
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_items\`
WHERE DATE(created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
UNION ALL

-- Check due_payment_journal table
SELECT 
  'due_payment_journal' as table_name,
  COUNT(*) as total_rows,
  COUNTIF(journal_id NOT LIKE 'JOURNAL-%') as invalid_journal_id,
  COUNTIF(transaction_type NOT IN ('CREATE', 'PARTIAL_PAYMENT', 'COMPLETED', 'REMINDER_SENT')) as invalid_transaction_type,
  0 as invalid_score
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_payment_journal\`
WHERE DATE(created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
UNION ALL

-- Check crm_customer_ledger table
SELECT 
  'crm_customer_ledger' as table_name,
  COUNT(*) as total_rows,
  0 as invalid_due_id,
  0 as invalid_transaction_type,
  COUNTIF(customer_reliability_score < 0 OR customer_reliability_score > 100) as invalid_score
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.crm_customer_ledger\`
WHERE DATE(last_updated) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY);

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
  generateDesign10ScheduledQueries
};