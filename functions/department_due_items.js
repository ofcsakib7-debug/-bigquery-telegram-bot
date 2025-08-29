/**
 * Department-Specific Due Items Implementation
 * 
 * This module implements the department-specific requirements
 * as specified in Design 10.
 */

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Get department-specific due items
 * @param {string} departmentId - Department ID
 * @param {string} entityType - Entity type (CUSTOMER, VENDOR, INTERNAL)
 * @returns {Array} Array of due items
 */
async function getDepartmentDueItems(departmentId, entityType) {
  try {
    let query = '';
    let params = { departmentId, entityType };
    
    switch (departmentId) {
      case 'INVENTORY':
        // INVENTORY: Must link due items to machine sales
        query = `
          SELECT
            d.*,
            i.machine_model_name,
            i.branch_id
          FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_payment_cache\` d
          JOIN \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.machine_inventory_cache\` i
            ON d.entity_id = i.sale_transaction_id
          WHERE d.entity_type = @entityType
            AND d.department_responsible = @departmentId
        `;
        break;
        
      case 'FINANCE':
        // FINANCE: Must integrate with accounting_general_ledger
        query = `
          SELECT
            d.*,
            g.account_head,
            g.voucher_type
          FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_payment_cache\` d
          JOIN \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.accounting_general_ledger\` g
            ON d.due_id = g.reference_id
          WHERE d.entity_type = @entityType
            AND d.department_responsible = @departmentId
        `;
        break;
        
      case 'INTERNAL':
        // INTERNAL: Must include utility and operational payments
        query = `
          SELECT
            due_id,
            entity_name,
            due_amount,
            due_date,
            internal_payment_type,
            department_responsible
          FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_payment_cache\`
          WHERE entity_type = @entityType
            AND department_responsible = @departmentId
        `;
        break;
        
      default:
        // Default query for other departments
        query = `
          SELECT *
          FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_payment_cache\`
          WHERE entity_type = @entityType
            AND department_responsible = @departmentId
        `;
    }
    
    const options = {
      query: query,
      location: 'US',
      params: params,
      maximumBytesBilled: process.env.BIGQUERY_MAX_BYTES_BILLED || '100000000' // 100MB default
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting department due items:', error);
    return [];
  }
}

/**
 * Get department-specific reminder strategies
 * @param {string} departmentId - Department ID
 * @returns {Object} BQML model information
 */
async function getDepartmentReminderStrategy(departmentId) {
  try {
    let query = '';
    
    switch (departmentId) {
      case 'SALES':
        // SALES: Must prioritize high-value customer payments
        return {
          modelName: 'sales_reminder_model',
          features: ['total_due_amount', 'customer_reliability_score'],
          label: 'is_high_priority'
        };
        
      case 'FINANCE':
        // FINANCE: Must prioritize overdue internal payments
        return {
          modelName: 'finance_reminder_model',
          features: ['due_amount', 'days_overdue'],
          label: 'is_high_priority'
        };
        
      default:
        // Default model for other departments
        return {
          modelName: 'default_reminder_model',
          features: ['due_amount', 'customer_reliability_score'],
          label: 'is_high_priority'
        };
    }
  } catch (error) {
    console.error('Error getting department reminder strategy:', error);
    return null;
  }
}

/**
 * Get role-based due management views
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {Array} Array of due items based on role
 */
async function getRoleBasedDueItems(userId, role) {
  try {
    let query = '';
    let params = { userId };
    
    switch (role) {
      case 'STAFF':
        // STAFF: Must only show their assigned due items
        query = `
          SELECT *
          FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_payment_cache\`
          WHERE assigned_to = @userId
            AND status IN ('PENDING', 'PARTIAL')
        `;
        break;
        
      case 'MANAGER':
        // MANAGER: Must show team due items with performance metrics
        query = `
          SELECT
            d.*,
            u.user_name,
            u.performance_score
          FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_payment_cache\` d
          JOIN \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.user_profiles\` u
            ON d.assigned_to = u.user_id
          WHERE u.manager_id = @userId
        `;
        break;
        
      case 'ADMIN':
        // ADMIN: Must show company-wide due items with reliability analysis
        query = `
          SELECT
            d.*,
            c.customer_reliability_score
          FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_payment_cache\` d
          JOIN \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.crm_customer_ledger\` c
            ON d.entity_id = c.customer_id
          WHERE d.entity_type = 'CUSTOMER'
        `;
        params = {}; // No user-specific parameters for admin
        break;
        
      default:
        // Default view for other roles
        query = `
          SELECT *
          FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_payment_cache\`
          WHERE assigned_to = @userId
        `;
    }
    
    const options = {
      query: query,
      location: 'US',
      params: params,
      maximumBytesBilled: process.env.BIGQUERY_MAX_BYTES_BILLED || '100000000' // 100MB default
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting role-based due items:', error);
    return [];
  }
}

/**
 * Train department-specific reminder model
 * @param {string} departmentId - Department ID
 * @returns {boolean} Success flag
 */
async function trainDepartmentReminderModel(departmentId) {
  try {
    let query = '';
    
    switch (departmentId) {
      case 'SALES':
        // SALES: Must prioritize high-value customer payments
        query = `
          CREATE OR REPLACE MODEL \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.sales_reminder_model\`
          OPTIONS(
            model_type = 'logistic_reg',
            input_label_cols = ['is_high_priority']
          ) AS
          SELECT
            total_due_amount,
            customer_reliability_score,
            CASE WHEN total_due_amount > 500000 THEN TRUE ELSE FALSE END AS is_high_priority
          FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.crm_customer_ledger\`
        `;
        break;
        
      case 'FINANCE':
        // FINANCE: Must prioritize overdue internal payments
        query = `
          CREATE OR REPLACE MODEL \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.finance_reminder_model\`
          OPTIONS(
            model_type = 'logistic_reg',
            input_label_cols = ['is_high_priority']
          ) AS
          SELECT
            due_amount,
            DATE_DIFF(CURRENT_DATE(), due_date, DAY) AS days_overdue,
            CASE WHEN days_overdue > 0 THEN TRUE ELSE FALSE END AS is_high_priority
          FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_payment_cache\`
          WHERE entity_type = 'INTERNAL'
        `;
        break;
        
      default:
        // Default model for other departments
        query = `
          CREATE OR REPLACE MODEL \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.default_reminder_model\`
          OPTIONS(
            model_type = 'logistic_reg',
            input_label_cols = ['is_high_priority']
          ) AS
          SELECT
            due_amount,
            customer_reliability_score,
            CASE WHEN due_amount > 100000 THEN TRUE ELSE FALSE END AS is_high_priority
          FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_payment_cache\`
        `;
    }
    
    const options = {
      query: query,
      location: 'US'
    };
    
    await bigquery.createQueryJob(options);
    
    return true;
  } catch (error) {
    console.error('Error training department reminder model:', error);
    return false;
  }
}

// Export functions
module.exports = {
  getDepartmentDueItems,
  getDepartmentReminderStrategy,
  getRoleBasedDueItems,
  trainDepartmentReminderModel
};
