/**
 * Personalized Commission Tracking System
 * 
 * This module implements the personalized commission tracking functionality
 * as specified in Design 12.
 */

const { BigQuery } = require('@google-cloud/bigquery');
const { getActiveCommissionAgreementForSalesperson, getApplicableCommissionTier } = require('./salesperson_commissions');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Calculate personalized commission for a sale
 * @param {string} salespersonId - Salesperson ID
 * @param {string} machineModelId - Machine model ID
 * @param {string} machineModelName - Machine model name
 * @param {number} salePriceBdt - Sale price in BDT
 * @returns {Object} Commission calculation result
 */
async function calculatePersonalizedCommission(salespersonId, machineModelId, machineModelName, salePriceBdt) {
  try {
    // 1. Get active commission agreement for this salesperson
    const agreement = await getActiveCommissionAgreementForSalesperson(salespersonId);
    
    if (!agreement) {
      return {
        commission_rate: 0.0,
        commission_amount: 0.0,
        error: 'No active commission agreement found'
      };
    }
    
    // 2. Get applicable tier for this machine model and sale price
    const tier = await getApplicableCommissionTier(agreement.agreement_id, machineModelId, salePriceBdt);
    
    if (!tier) {
      return {
        commission_rate: 0.0,
        commission_amount: 0.0,
        error: 'No applicable commission tier found'
      };
    }
    
    // 3. Calculate commission amount
    const commissionAmount = salePriceBdt * (tier.commission_rate / 100);
    
    return {
      agreement_id: agreement.agreement_id,
      commission_rate: tier.commission_rate,
      commission_amount: commissionAmount,
      tier_description: tier.tier_description
    };
  } catch (error) {
    console.error('Error calculating personalized commission:', error);
    return {
      commission_rate: 0.0,
      commission_amount: 0.0,
      error: 'Error calculating commission'
    };
  }
}

/**
 * Track personalized commission for a sale
 * @param {Object} commissionData - Commission tracking data
 * @returns {string} Tracking ID
 */
async function trackPersonalizedCommission(commissionData) {
  try {
    // Generate tracking ID
    const trackingId = `TRACK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Calculate commission if not provided
    let commissionRate = commissionData.commissionRate;
    let commissionAmount = commissionData.commissionAmount;
    
    if (commissionRate === undefined || commissionAmount === undefined) {
      const calculation = await calculatePersonalizedCommission(
        commissionData.salespersonId,
        commissionData.machineModelId,
        commissionData.machineModelName,
        commissionData.salePriceBdt
      );
      
      if (calculation.error) {
        throw new Error(calculation.error);
      }
      
      commissionRate = calculation.commission_rate;
      commissionAmount = calculation.commission_amount;
    }
    
    // Set values
    const tracking = {
      tracking_id: trackingId,
      challan_number: commissionData.challanNumber,
      sale_transaction_id: commissionData.saleTransactionId,
      machine_model_id: commissionData.machineModelId,
      machine_model_name: commissionData.machineModelName,
      sale_price_bdt: commissionData.salePriceBdt,
      applicable_agreement_id: commissionData.applicableAgreementId,
      applicable_tier_id: commissionData.applicableTierId,
      commission_rate: commissionRate,
      commission_amount_bdt: commissionAmount,
      marketing_incentive_bdt: commissionData.marketingIncentiveBdt || null,
      marketing_staff_id: commissionData.marketingStaffId || null,
      marketing_staff_name: commissionData.marketingStaffName || null,
      marketing_activity_id: commissionData.marketingActivityId || null,
      salesperson_id: commissionData.salespersonId,
      salesperson_name: commissionData.salespersonName,
      commission_calculated_date: commissionData.commissionCalculatedDate || new Date().toISOString().split('T')[0],
      commission_due_date: commissionData.commissionDueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      commission_paid_date: commissionData.commissionPaidDate || null,
      payment_status: commissionData.paymentStatus || 'PENDING',
      created_at: new Date().toISOString()
    };
    
    // Insert commission tracking record
    const query = `
      INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.personalized_commission_tracking\`
      (tracking_id, challan_number, sale_transaction_id, machine_model_id, machine_model_name, sale_price_bdt,
       applicable_agreement_id, applicable_tier_id, commission_rate, commission_amount_bdt, marketing_incentive_bdt,
       marketing_staff_id, marketing_staff_name, marketing_activity_id, salesperson_id, salesperson_name,
       commission_calculated_date, commission_due_date, commission_paid_date, payment_status, created_at)
      VALUES
      (@tracking_id, @challan_number, @sale_transaction_id, @machine_model_id, @machine_model_name, @sale_price_bdt,
       @applicable_agreement_id, @applicable_tier_id, @commission_rate, @commission_amount_bdt, @marketing_incentive_bdt,
       @marketing_staff_id, @marketing_staff_name, @marketing_activity_id, @salesperson_id, @salesperson_name,
       @commission_calculated_date, @commission_due_date, @commission_paid_date, @payment_status, @created_at)
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: tracking
    };
    
    await bigquery.createQueryJob(options);
    
    return trackingId;
  } catch (error) {
    console.error('Error tracking personalized commission:', error);
    throw error;
  }
}

/**
 * Get personalized commission by tracking ID
 * @param {string} trackingId - Tracking ID
 * @returns {Object|null} Commission tracking record or null if not found
 */
async function getPersonalizedCommission(trackingId) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.personalized_commission_tracking\`
      WHERE tracking_id = @trackingId
      LIMIT 1
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        trackingId: trackingId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting personalized commission:', error);
    return null;
  }
}

/**
 * Get personalized commissions by challan number
 * @param {string} challanNumber - Challan number
 * @returns {Array} Array of commission tracking records
 */
async function getPersonalizedCommissionsByChallan(challanNumber) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.personalized_commission_tracking\`
      WHERE challan_number = @challanNumber
      ORDER BY commission_calculated_date DESC
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        challanNumber: challanNumber
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting personalized commissions by challan:', error);
    return [];
  }
}

/**
 * Get personalized commissions by salesperson ID
 * @param {string} salespersonId - Salesperson ID
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of commission tracking records
 */
async function getPersonalizedCommissionsBySalesperson(salespersonId, filters = {}) {
  try {
    let query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.personalized_commission_tracking\`
      WHERE salesperson_id = @salespersonId
    `;
    
    const params = {
      salespersonId: salespersonId
    };
    
    // Add payment status filter if provided
    if (filters.paymentStatus) {
      query += ' AND payment_status = @paymentStatus';
      params.paymentStatus = filters.paymentStatus;
    }
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND commission_calculated_date >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND commission_calculated_date <= @endDate';
      params.endDate = filters.endDate;
    }
    
    query += ' ORDER BY commission_calculated_date DESC';
    
    // Add limit if provided
    if (filters.limit) {
      query += ' LIMIT @limit';
      params.limit = filters.limit;
    }
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting personalized commissions by salesperson:', error);
    return [];
  }
}

/**
 * Update commission payment status
 * @param {string} trackingId - Tracking ID
 * @param {string} status - Payment status
 * @param {Object} additionalData - Additional data to update
 * @returns {boolean} Success flag
 */
async function updateCommissionPaymentStatus(trackingId, status, additionalData = {}) {
  try {
    // Build update query dynamically
    const fields = [`payment_status = @payment_status`, `updated_at = @updated_at`];
    const params = {
      trackingId: trackingId,
      payment_status: status,
      updated_at: new Date().toISOString()
    };
    
    // Add additional fields if provided
    if (additionalData.commissionPaidDate) {
      fields.push('commission_paid_date = @commission_paid_date');
      params.commission_paid_date = additionalData.commissionPaidDate;
    }
    
    // Add other fields as needed
    for (const [key, value] of Object.entries(additionalData)) {
      if (key !== 'commissionPaidDate') {
        // Map camelCase to snake_case for BigQuery fields
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbField} = @${key}`);
        params[key] = value;
      }
    }
    
    const query = `
      UPDATE \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.personalized_commission_tracking\`
      SET ${fields.join(', ')}
      WHERE tracking_id = @trackingId
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    await bigquery.createQueryJob(options);
    
    return true;
  } catch (error) {
    console.error('Error updating commission payment status:', error);
    return false;
  }
}

/**
 * Get commission summary for a salesperson
 * @param {string} salespersonId - Salesperson ID
 * @param {Object} filters - Additional filters
 * @returns {Object|null} Commission summary or null if not found
 */
async function getCommissionSummaryForSalesperson(salespersonId, filters = {}) {
  try {
    let query = `
      SELECT 
        salesperson_id,
        salesperson_name,
        COUNT(*) as total_commissions,
        SUM(commission_amount_bdt) as total_commission_amount_bdt,
        SUM(marketing_incentive_bdt) as total_marketing_incentive_bdt,
        AVG(commission_rate) as average_commission_rate,
        MIN(commission_calculated_date) as first_commission_date,
        MAX(commission_calculated_date) as last_commission_date,
        COUNTIF(payment_status = 'PAID') as paid_commissions,
        COUNTIF(payment_status = 'PENDING') as pending_commissions
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.personalized_commission_tracking\`
      WHERE salesperson_id = @salespersonId
    `;
    
    const params = {
      salespersonId: salespersonId
    };
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND commission_calculated_date >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND commission_calculated_date <= @endDate';
      params.endDate = filters.endDate;
    }
    
    query += ' GROUP BY salesperson_id, salesperson_name';
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting commission summary for salesperson:', error);
    return null;
  }
}

/**
 * Get unpaid commissions
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of unpaid commission records
 */
async function getUnpaidCommissions(filters = {}) {
  try {
    let query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.personalized_commission_tracking\`
      WHERE payment_status = 'PENDING'
    `;
    
    const params = {};
    
    // Add salesperson filter if provided
    if (filters.salespersonId) {
      query += ' AND salesperson_id = @salespersonId';
      params.salespersonId = filters.salespersonId;
    }
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND commission_calculated_date >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND commission_calculated_date <= @endDate';
      params.endDate = filters.endDate;
    }
    
    query += ' ORDER BY commission_calculated_date ASC';
    
    // Add limit if provided
    if (filters.limit) {
      query += ' LIMIT @limit';
      params.limit = filters.limit;
    }
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting unpaid commissions:', error);
    return [];
  }
}

// Export functions
module.exports = {
  calculatePersonalizedCommission,
  trackPersonalizedCommission,
  getPersonalizedCommission,
  getPersonalizedCommissionsByChallan,
  getPersonalizedCommissionsBySalesperson,
  updateCommissionPaymentStatus,
  getCommissionSummaryForSalesperson,
  getUnpaidCommissions
};