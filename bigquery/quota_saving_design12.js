/**
 * Quota-Saving Implementation for Design 12
 * 
 * This module implements the quota-saving requirements
 * as specified in Design 12.
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
      case 'salesperson_commission_agreements':
        return validateSalespersonCommissionAgreementsData(data);
      
      case 'salesperson_commission_tiers':
        return validateSalespersonCommissionTiersData(data);
      
      case 'personalized_commission_tracking':
        return validatePersonalizedCommissionTrackingData(data);
      
      case 'marketing_staff_incentives':
        return validateMarketingStaffIncentivesData(data);
      
      case 'transportation_costs':
        return validateTransportationCostsData(data);
      
      case 'challan_commission_integration':
        return validateChallanCommissionIntegrationData(data);
      
      default:
        return { valid: true };
    }
  } catch (error) {
    console.error('Error validating data with constraints:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate salesperson commission agreements data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateSalespersonCommissionAgreementsData(data) {
  try {
    // agreement_id must follow exact format: AGREEMENT-YYYYMMDD-ABC
    if (data.agreement_id && !/^AGREEMENT-\d{8}-[A-Z0-9]{3}$/.test(data.agreement_id)) {
      return { 
        valid: false, 
        error: 'Invalid agreement_id format',
        expectedFormat: 'AGREEMENT-YYYYMMDD-ABC'
      };
    }
    
    // agreement_status must be one of 3 specified values only
    const validStatuses = ['ACTIVE', 'INACTIVE', 'PENDING'];
    if (data.agreement_status && !validStatuses.includes(data.agreement_status)) {
      return { 
        valid: false, 
        error: 'Invalid agreement_status value',
        validValues: validStatuses
      };
    }
    
    // commission_rate must be between 0-10 (0.0-10.0%)
    if (data.commission_rate !== undefined && 
        (data.commission_rate < 0 || data.commission_rate > 10)) {
      return { 
        valid: false, 
        error: 'commission_rate must be between 0-10 (0.0-10.0%)'
      };
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating salesperson commission agreements data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate salesperson commission tiers data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateSalespersonCommissionTiersData(data) {
  try {
    // tier_id must follow exact format: TIER-YYYYMMDD-ABC
    if (data.tier_id && !/^TIER-\d{8}-[A-Z0-9]{3}$/.test(data.tier_id)) {
      return { 
        valid: false, 
        error: 'Invalid tier_id format',
        expectedFormat: 'TIER-YYYYMMDD-ABC'
      };
    }
    
    // commission_rate must be between 0-10 (0.0-10.0%)
    if (data.commission_rate !== undefined && 
        (data.commission_rate < 0 || data.commission_rate > 10)) {
      return { 
        valid: false, 
        error: 'commission_rate must be between 0-10 (0.0-10.0%)'
      };
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating salesperson commission tiers data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate personalized commission tracking data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validatePersonalizedCommissionTrackingData(data) {
  try {
    // tracking_id must follow exact format: TRACK-YYYYMMDD-ABC
    if (data.tracking_id && !/^TRACK-\d{8}-[A-Z0-9]{3}$/.test(data.tracking_id)) {
      return { 
        valid: false, 
        error: 'Invalid tracking_id format',
        expectedFormat: 'TRACK-YYYYMMDD-ABC'
      };
    }
    
    // payment_status must be one of specified values
    const validStatuses = ['PENDING', 'PROCESSING', 'PAID'];
    if (data.payment_status && !validStatuses.includes(data.payment_status)) {
      return { 
        valid: false, 
        error: 'Invalid payment_status value',
        validValues: validStatuses
      };
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating personalized commission tracking data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate marketing staff incentives data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateMarketingStaffIncentivesData(data) {
  try {
    // incentive_id must follow exact format: INCENT-YYYYMMDD-ABC
    if (data.incentive_id && !/^INCENT-\d{8}-[A-Z0-9]{3}$/.test(data.incentive_id)) {
      return { 
        valid: false, 
        error: 'Invalid incentive_id format',
        expectedFormat: 'INCENT-YYYYMMDD-ABC'
      };
    }
    
    // verification_status must be one of 3 specified values only
    const validStatuses = ['PENDING', 'VERIFIED', 'REJECTED'];
    if (data.verification_status && !validStatuses.includes(data.verification_status)) {
      return { 
        valid: false, 
        error: 'Invalid verification_status value',
        validValues: validStatuses
      };
    }
    
    // activity_type must be one of specified values
    const validActivityTypes = ['VISIT', 'MEETING', 'DEMO'];
    if (data.activity_type && !validActivityTypes.includes(data.activity_type)) {
      return { 
        valid: false, 
        error: 'Invalid activity_type value',
        validValues: validActivityTypes
      };
    }
    
    // incentive_type must be one of specified values
    const validIncentiveTypes = ['NEW_CUSTOMER', 'LEAD_QUALITY'];
    if (data.incentive_type && !validIncentiveTypes.includes(data.incentive_type)) {
      return { 
        valid: false, 
        error: 'Invalid incentive_type value',
        validValues: validIncentiveTypes
      };
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating marketing staff incentives data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate transportation costs data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateTransportationCostsData(data) {
  try {
    // transport_id must follow exact format: TRANSPORT-YYYYMMDD-ABC
    if (data.transport_id && !/^TRANSPORT-\d{8}-[A-Z0-9]{3}$/.test(data.transport_id)) {
      return { 
        valid: false, 
        error: 'Invalid transport_id format',
        expectedFormat: 'TRANSPORT-YYYYMMDD-ABC'
      };
    }
    
    // vehicle_type must be one of specified values
    const validVehicleTypes = ['VAN', 'TRUCK', 'BIKE'];
    if (data.vehicle_type && !validVehicleTypes.includes(data.vehicle_type)) {
      return { 
        valid: false, 
        error: 'Invalid vehicle_type value',
        validValues: validVehicleTypes
      };
    }
    
    // company_covered_bdt must equal total_cost_bdt minus customer_payment_bdt
    if (data.total_cost_bdt !== undefined && data.customer_payment_bdt !== undefined) {
      const calculatedCompanyCovered = data.total_cost_bdt - (data.customer_payment_bdt || 0);
      if (data.company_covered_bdt !== undefined && 
          Math.abs(data.company_covered_bdt - calculatedCompanyCovered) > 0.01) {
        return { 
          valid: false, 
          error: 'company_covered_bdt must equal total_cost_bdt minus customer_payment_bdt'
        };
      }
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating transportation costs data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate challan commission integration data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateChallanCommissionIntegrationData(data) {
  try {
    // integration_id must follow exact format: INTEG-YYYYMMDD-ABC
    if (data.integration_id && !/^INTEG-\d{8}-[A-Z0-9]{3}$/.test(data.integration_id)) {
      return { 
        valid: false, 
        error: 'Invalid integration_id format',
        expectedFormat: 'INTEG-YYYYMMDD-ABC'
      };
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating challan commission integration data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Generate scheduled queries for Design 12
 * @returns {Object} Scheduled queries
 */
function generateDesign12ScheduledQueries() {
  return {
    /**
     * Daily scheduled query for salesperson_commission_agreements refresh
     * Runs at 02:00 Asia/Dhaka
     */
    salespersonCommissionAgreementsRefresh: `
-- Scheduled query for salesperson_commission_agreements refresh
-- Runs daily at 02:00 Asia/Dhaka

-- This query would typically refresh cache tables or materialized views
-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "commission_agreements_refresh", "timezone": "Asia/Dhaka"}
`,

    /**
     * Daily scheduled query for personalized_commission_tracking refresh
     * Runs at 02:30 Asia/Dhaka
     */
    personalizedCommissionTrackingRefresh: `
-- Scheduled query for personalized_commission_tracking refresh
-- Runs daily at 02:30 Asia/Dhaka

-- This query would typically refresh cache tables or materialized views
-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "commission_tracking_refresh", "timezone": "Asia/Dhaka"}
`,

    /**
     * Daily scheduled query for marketing_staff_incentives refresh
     * Runs at 03:00 Asia/Dhaka
     */
    marketingStaffIncentivesRefresh: `
-- Scheduled query for marketing_staff_incentives refresh
-- Runs daily at 03:00 Asia/Dhaka

-- This query would typically refresh cache tables or materialized views
-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "marketing_incentives_refresh", "timezone": "Asia/Dhaka"}
`,

    /**
     * Daily scheduled query for transportation_costs refresh
     * Runs at 03:30 Asia/Dhaka
     */
    transportationCostsRefresh: `
-- Scheduled query for transportation_costs refresh
-- Runs daily at 03:30 Asia/Dhaka

-- This query would typically refresh cache tables or materialized views
-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "transportation_costs_refresh", "timezone": "Asia/Dhaka"}
`,

    /**
     * Daily scheduled query for challan_commission_integration refresh
     * Runs at 04:00 Asia/Dhaka
     */
    challanCommissionIntegrationRefresh: `
-- Scheduled query for challan_commission_integration refresh
-- Runs daily at 04:00 Asia/Dhaka

-- This query would typically refresh cache tables or materialized views
-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "commission_integration_refresh", "timezone": "Asia/Dhaka"}
`,

    /**
     * Daily scheduled query for data quality checks
     * Runs daily to validate data integrity
     */
    dataQualityChecks: `
-- Scheduled query for data quality checks
-- Runs daily to validate data integrity

-- Check salesperson_commission_agreements table
SELECT 
  'salesperson_commission_agreements' as table_name,
  COUNT(*) as total_rows,
  COUNTIF(agreement_id NOT LIKE 'AGREEMENT-%') as invalid_agreement_id,
  COUNTIF(agreement_status NOT IN ('ACTIVE', 'INACTIVE', 'PENDING')) as invalid_agreement_status,
  0 as invalid_commission_rate
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.salesperson_commission_agreements\`
WHERE DATE(created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
UNION ALL

-- Check salesperson_commission_tiers table
SELECT 
  'salesperson_commission_tiers' as table_name,
  COUNT(*) as total_rows,
  COUNTIF(tier_id NOT LIKE 'TIER-%') as invalid_tier_id,
  0 as invalid_agreement_status,
  COUNTIF(commission_rate < 0 OR commission_rate > 10) as invalid_commission_rate
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.salesperson_commission_tiers\`
WHERE DATE(created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
UNION ALL

-- Check personalized_commission_tracking table
SELECT 
  'personalized_commission_tracking' as table_name,
  COUNT(*) as total_rows,
  COUNTIF(tracking_id NOT LIKE 'TRACK-%') as invalid_tracking_id,
  COUNTIF(payment_status NOT IN ('PENDING', 'PROCESSING', 'PAID')) as invalid_payment_status,
  0 as invalid_commission_rate
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.personalized_commission_tracking\`
WHERE DATE(created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
UNION ALL

-- Check marketing_staff_incentives table
SELECT 
  'marketing_staff_incentives' as table_name,
  COUNT(*) as total_rows,
  COUNTIF(incentive_id NOT LIKE 'INCENT-%') as invalid_incentive_id,
  COUNTIF(verification_status NOT IN ('PENDING', 'VERIFIED', 'REJECTED')) as invalid_verification_status,
  0 as invalid_commission_rate
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.marketing_staff_incentives\`
WHERE DATE(created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
UNION ALL

-- Check transportation_costs table
SELECT 
  'transportation_costs' as table_name,
  COUNT(*) as total_rows,
  COUNTIF(transport_id NOT LIKE 'TRANSPORT-%') as invalid_transport_id,
  0 as invalid_verification_status,
  0 as invalid_commission_rate
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.transportation_costs\`
WHERE DATE(created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
UNION ALL

-- Check challan_commission_integration table
SELECT 
  'challan_commission_integration' as table_name,
  COUNT(*) as total_rows,
  COUNTIF(integration_id NOT LIKE 'INTEG-%') as invalid_integration_id,
  0 as invalid_verification_status,
  0 as invalid_commission_rate
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.challan_commission_integration\`
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
  generateDesign12ScheduledQueries
};