/**
 * Salesperson Commission Management System
 * 
 * This module implements the salesperson commission management functionality
 * as specified in Design 12.
 */

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Create a new salesperson commission agreement
 * @param {Object} agreementData - Commission agreement data
 * @returns {string} Agreement ID
 */
async function createSalespersonCommissionAgreement(agreementData) {
  try {
    // Generate agreement ID
    const agreementId = `AGREEMENT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Set values
    const agreement = {
      agreement_id: agreementId,
      salesperson_id: agreementData.salespersonId,
      salesperson_name: agreementData.salespersonName,
      role_id: agreementData.roleId,
      effective_from: agreementData.effectiveFrom,
      effective_to: agreementData.effectiveTo || null,
      agreement_status: agreementData.agreementStatus || 'PENDING',
      approved_by: agreementData.approvedBy,
      approved_at: agreementData.approvedAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Insert commission agreement
    const query = `
      INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.salesperson_commission_agreements\`
      (agreement_id, salesperson_id, salesperson_name, role_id, effective_from, effective_to,
       agreement_status, approved_by, approved_at, created_at, updated_at)
      VALUES
      (@agreement_id, @salesperson_id, @salesperson_name, @role_id, @effective_from, @effective_to,
       @agreement_status, @approved_by, @approved_at, @created_at, @updated_at)
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: agreement
    };
    
    await bigquery.createQueryJob(options);
    
    return agreementId;
  } catch (error) {
    console.error('Error creating salesperson commission agreement:', error);
    throw error;
  }
}

/**
 * Get salesperson commission agreement by ID
 * @param {string} agreementId - Agreement ID
 * @returns {Object|null} Commission agreement or null if not found
 */
async function getSalespersonCommissionAgreement(agreementId) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.salesperson_commission_agreements\`
      WHERE agreement_id = @agreementId
      LIMIT 1
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        agreementId: agreementId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting salesperson commission agreement:', error);
    return null;
  }
}

/**
 * Get active commission agreement for a salesperson
 * @param {string} salespersonId - Salesperson ID
 * @returns {Object|null} Active commission agreement or null if not found
 */
async function getActiveCommissionAgreementForSalesperson(salespersonId) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.salesperson_commission_agreements\`
      WHERE salesperson_id = @salespersonId
        AND CURRENT_DATE() BETWEEN effective_from AND COALESCE(effective_to, CURRENT_DATE())
        AND agreement_status = 'ACTIVE'
      ORDER BY effective_from DESC
      LIMIT 1
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        salespersonId: salespersonId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting active commission agreement for salesperson:', error);
    return null;
  }
}

/**
 * Update salesperson commission agreement status
 * @param {string} agreementId - Agreement ID
 * @param {string} status - New status
 * @param {Object} additionalData - Additional data to update
 * @returns {boolean} Success flag
 */
async function updateSalespersonCommissionAgreementStatus(agreementId, status, additionalData = {}) {
  try {
    // Build update query dynamically
    const fields = [`agreement_status = @agreement_status`, `updated_at = @updated_at`];
    const params = {
      agreementId: agreementId,
      agreement_status: status,
      updated_at: new Date().toISOString()
    };
    
    // Add additional fields if provided
    for (const [key, value] of Object.entries(additionalData)) {
      // Map camelCase to snake_case for BigQuery fields
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${dbField} = @${key}`);
      params[key] = value;
    }
    
    const query = `
      UPDATE \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.salesperson_commission_agreements\`
      SET ${fields.join(', ')}
      WHERE agreement_id = @agreementId
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    await bigquery.createQueryJob(options);
    
    return true;
  } catch (error) {
    console.error('Error updating salesperson commission agreement status:', error);
    return false;
  }
}

/**
 * Create a commission tier for an agreement
 * @param {Object} tierData - Commission tier data
 * @returns {string} Tier ID
 */
async function createCommissionTier(tierData) {
  try {
    // Generate tier ID
    const tierId = `TIER-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Set values
    const tier = {
      tier_id: tierId,
      agreement_id: tierData.agreementId,
      machine_model_id: tierData.machineModelId,
      machine_model_name: tierData.machineModelName,
      minimum_sales_value_bdt: tierData.minimumSalesValueBdt || null,
      commission_rate: tierData.commissionRate,
      tier_description: tierData.tierDescription,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Insert commission tier
    const query = `
      INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.salesperson_commission_tiers\`
      (tier_id, agreement_id, machine_model_id, machine_model_name, minimum_sales_value_bdt,
       commission_rate, tier_description, created_at, updated_at)
      VALUES
      (@tier_id, @agreement_id, @machine_model_id, @machine_model_name, @minimum_sales_value_bdt,
       @commission_rate, @tier_description, @created_at, @updated_at)
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: tier
    };
    
    await bigquery.createQueryJob(options);
    
    return tierId;
  } catch (error) {
    console.error('Error creating commission tier:', error);
    throw error;
  }
}

/**
 * Get commission tiers for an agreement
 * @param {string} agreementId - Agreement ID
 * @returns {Array} Array of commission tiers
 */
async function getCommissionTiersForAgreement(agreementId) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.salesperson_commission_tiers\`
      WHERE agreement_id = @agreementId
      ORDER BY minimum_sales_value_bdt ASC
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        agreementId: agreementId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting commission tiers for agreement:', error);
    return [];
  }
}

/**
 * Get applicable commission tier for a sale
 * @param {string} agreementId - Agreement ID
 * @param {string} machineModelId - Machine model ID
 * @param {number} salePriceBdt - Sale price in BDT
 * @returns {Object|null} Applicable commission tier or null if not found
 */
async function getApplicableCommissionTier(agreementId, machineModelId, salePriceBdt) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.salesperson_commission_tiers\`
      WHERE agreement_id = @agreementId
        AND machine_model_id = @machineModelId
        AND (@salePriceBdt >= minimum_sales_value_bdt OR minimum_sales_value_bdt IS NULL)
      ORDER BY minimum_sales_value_bdt DESC
      LIMIT 1
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        agreementId: agreementId,
        machineModelId: machineModelId,
        salePriceBdt: salePriceBdt
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting applicable commission tier:', error);
    return null;
  }
}

/**
 * Get salesperson commission agreements by status
 * @param {string} status - Agreement status
 * @returns {Array} Array of commission agreements
 */
async function getSalespersonCommissionAgreementsByStatus(status) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.salesperson_commission_agreements\`
      WHERE agreement_status = @status
      ORDER BY salesperson_name
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        status: status
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting salesperson commission agreements by status:', error);
    return [];
  }
}

/**
 * Get commission agreements for a salesperson
 * @param {string} salespersonId - Salesperson ID
 * @returns {Array} Array of commission agreements
 */
async function getCommissionAgreementsForSalesperson(salespersonId) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.salesperson_commission_agreements\`
      WHERE salesperson_id = @salespersonId
      ORDER BY effective_from DESC
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        salespersonId: salespersonId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting commission agreements for salesperson:', error);
    return [];
  }
}

// Export functions
module.exports = {
  createSalespersonCommissionAgreement,
  getSalespersonCommissionAgreement,
  getActiveCommissionAgreementForSalesperson,
  updateSalespersonCommissionAgreementStatus,
  createCommissionTier,
  getCommissionTiersForAgreement,
  getApplicableCommissionTier,
  getSalespersonCommissionAgreementsByStatus,
  getCommissionAgreementsForSalesperson
};