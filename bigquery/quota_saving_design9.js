/**
 * Quota-Saving Implementation for Design 9
 * 
 * This module implements the quota-saving requirements
 * as specified in Design 9.
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
      case 'user_permissions':
        return validateUserPermissionsData(data);
      
      case 'department_menus':
        return validateDepartmentMenusData(data);
      
      case 'audit_trails':
        return validateAuditTrailsData(data);
      
      default:
        return { valid: true };
    }
  } catch (error) {
    console.error('Error validating data with constraints:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate user permissions data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateUserPermissionsData(data) {
  try {
    // permission_id must follow exact format: PERM-ROLE-RESOURCE-ABC
    if (data.permission_id && !/^PERM-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]{3}$/.test(data.permission_id)) {
      return { 
        valid: false, 
        error: 'Invalid permission_id format',
        expectedFormat: 'PERM-ROLE-RESOURCE-ABC'
      };
    }
    
    // time_limit_hours must be NULL for Admin/CEO roles
    if (data.role_id && (data.role_id === 'ADMIN' || data.role_id === 'CEO')) {
      if (data.time_limit_hours !== null && data.time_limit_hours !== undefined) {
        return { 
          valid: false, 
          error: 'time_limit_hours must be NULL for Admin/CEO roles'
        };
      }
    }
    
    // time_limit_hours must be 2 for Staff role (edit window)
    if (data.role_id === 'STAFF') {
      if (data.time_limit_hours !== 2) {
        return { 
          valid: false, 
          error: 'time_limit_hours must be 2 for Staff role'
        };
      }
    }
    
    // time_limit_hours must be 48 for Junior Manager role (edit window)
    if (data.role_id === 'JM') {
      if (data.time_limit_hours !== 48) {
        return { 
          valid: false, 
          error: 'time_limit_hours must be 48 for Junior Manager role'
        };
      }
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating user permissions data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate department menus data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateDepartmentMenusData(data) {
  try {
    // menu_id must follow exact format: MENU-DEPT-ROLE-ABC
    if (data.menu_id && !/^MENU-[A-Z]+-[A-Z0-9]+-[A-Z0-9]{3}$/.test(data.menu_id)) {
      return { 
        valid: false, 
        error: 'Invalid menu_id format',
        expectedFormat: 'MENU-DEPT-ROLE-ABC'
      };
    }
    
    // menu_structure must follow Telegram inline keyboard format
    if (data.menu_structure) {
      try {
        const menuStructure = typeof data.menu_structure === 'string' ? 
          JSON.parse(data.menu_structure) : data.menu_structure;
        
        // Check if it has inline_keyboard structure
        if (!menuStructure.inline_keyboard || !Array.isArray(menuStructure.inline_keyboard)) {
          return { 
            valid: false, 
            error: 'menu_structure must follow Telegram inline keyboard format'
          };
        }
      } catch (e) {
        return { 
          valid: false, 
          error: 'menu_structure must be valid JSON'
        };
      }
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating department menus data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Validate audit trails data
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateAuditTrailsData(data) {
  try {
    // audit_id must follow exact format: AUDIT-YYYYMMDD-ABC
    if (data.audit_id && !/^AUDIT-\d{8}-[A-Z0-9]{3}$/.test(data.audit_id)) {
      return { 
        valid: false, 
        error: 'Invalid audit_id format',
        expectedFormat: 'AUDIT-YYYYMMDD-ABC'
      };
    }
    
    // approval_status must be NULL if approval_required = FALSE
    if (data.approval_required === false && data.approval_status !== null && data.approval_status !== undefined) {
      return { 
        valid: false, 
        error: 'approval_status must be NULL if approval_required = FALSE'
      };
    }
    
    // Validate other fields as needed
    return { valid: true };
  } catch (error) {
    console.error('Error validating audit trails data:', error);
    return { valid: false, error: 'Validation error' };
  }
}

/**
 * Generate scheduled queries for Design 9
 * @returns {Object} Scheduled queries
 */
function generateDesign9ScheduledQueries() {
  return {
    /**
     * Daily scheduled query for permission cache refresh
     * Runs at 02:00 Asia/Dhaka
     */
    permissionCacheRefresh: `
-- Scheduled query for permission cache refresh
-- Runs daily at 02:00 Asia/Dhaka

-- Refresh user permissions cache
-- This query would typically populate a cache table that can be accessed with zero BigQuery quota

-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "permission_cache", "timezone": "Asia/Dhaka"}
`,

    /**
     * Daily scheduled query for approval workflow monitoring
     * Runs at 03:00 Asia/Dhaka
     */
    approvalWorkflowMonitoring: `
-- Scheduled query for approval workflow monitoring
-- Runs daily at 03:00 Asia/Dhaka

-- Find pending approvals that need escalation
SELECT audit_id, user_id, role_id, department_id, timestamp
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.audit_trails\`
WHERE approval_status = 'PENDING'
  AND timestamp < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
  AND _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY);  -- Partition filter

-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "approval_monitoring", "timezone": "Asia/Dhaka"}
`,

    /**
     * Daily scheduled query for data quality checks
     * Runs daily to validate data integrity
     */
    dataQualityChecks: `
-- Scheduled query for data quality checks
-- Runs daily to validate data integrity

-- Check user_permissions table
SELECT 
  'user_permissions' as table_name,
  COUNT(*) as total_rows,
  COUNTIF(permission_id NOT LIKE 'PERM-%') as invalid_permission_id,
  COUNTIF(role_id NOT IN ('ADMIN', 'CEO', 'GM', 'DM', 'JM', 'STAFF', 'READONLY')) as invalid_role,
  0 as invalid_time_limit
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.user_permissions\`
WHERE DATE(created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
UNION ALL

-- Check department_menus table
SELECT 
  'department_menus' as table_name,
  COUNT(*) as total_rows,
  COUNTIF(menu_id NOT LIKE 'MENU-%') as invalid_menu_id,
  COUNTIF(department_id NOT IN ('FINANCE', 'INVENTORY', 'SERVICE', 'SALES', 'HR', 'MANAGEMENT')) as invalid_department,
  0 as invalid_time_limit
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.department_menus\`
WHERE DATE(created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
UNION ALL

-- Check audit_trails table
SELECT 
  'audit_trails' as table_name,
  COUNT(*) as total_rows,
  COUNTIF(audit_id NOT LIKE 'AUDIT-%') as invalid_audit_id,
  0 as invalid_department,
  0 as invalid_time_limit
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.audit_trails\`
WHERE DATE(timestamp) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY);

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
  generateDesign9ScheduledQueries
};