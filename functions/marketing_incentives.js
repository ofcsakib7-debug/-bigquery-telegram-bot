/**
 * Marketing Staff Incentive System
 * 
 * This module implements the marketing staff incentive functionality
 * as specified in Design 12.
 */

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Record a marketing staff incentive
 * @param {Object} incentiveData - Incentive data
 * @returns {string} Incentive ID
 */
async function recordMarketingIncentive(incentiveData) {
  try {
    // Generate incentive ID
    const incentiveId = `INCENT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Set values
    const incentive = {
      incentive_id: incentiveId,
      marketing_staff_id: incentiveData.marketingStaffId,
      marketing_staff_name: incentiveData.marketingStaffName,
      activity_id: incentiveData.activityId,
      activity_type: incentiveData.activityType,
      activity_date: incentiveData.activityDate || new Date().toISOString().split('T')[0],
      challan_number: incentiveData.challanNumber,
      sale_transaction_id: incentiveData.saleTransactionId,
      incentive_type: incentiveData.incentiveType,
      incentive_amount_bdt: incentiveData.incentiveAmountBdt,
      verification_status: incentiveData.verificationStatus || 'PENDING',
      verification_notes: incentiveData.verificationNotes || null,
      verified_by: incentiveData.verifiedBy || null,
      verified_at: incentiveData.verifiedAt || null,
      created_at: new Date().toISOString()
    };
    
    // Insert incentive record
    const query = `
      INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.marketing_staff_incentives\`
      (incentive_id, marketing_staff_id, marketing_staff_name, activity_id, activity_type, activity_date,
       challan_number, sale_transaction_id, incentive_type, incentive_amount_bdt, verification_status,
       verification_notes, verified_by, verified_at, created_at)
      VALUES
      (@incentive_id, @marketing_staff_id, @marketing_staff_name, @activity_id, @activity_type, @activity_date,
       @challan_number, @sale_transaction_id, @incentive_type, @incentive_amount_bdt, @verification_status,
       @verification_notes, @verified_by, @verified_at, @created_at)
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: incentive
    };
    
    await bigquery.createQueryJob(options);
    
    return incentiveId;
  } catch (error) {
    console.error('Error recording marketing incentive:', error);
    throw error;
  }
}

/**
 * Get marketing incentive by ID
 * @param {string} incentiveId - Incentive ID
 * @returns {Object|null} Incentive record or null if not found
 */
async function getMarketingIncentive(incentiveId) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.marketing_staff_incentives\`
      WHERE incentive_id = @incentiveId
      LIMIT 1
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        incentiveId: incentiveId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting marketing incentive:', error);
    return null;
  }
}

/**
 * Get marketing incentives by marketing staff ID
 * @param {string} marketingStaffId - Marketing staff ID
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of incentive records
 */
async function getMarketingIncentivesByStaff(marketingStaffId, filters = {}) {
  try {
    let query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.marketing_staff_incentives\`
      WHERE marketing_staff_id = @marketingStaffId
    `;
    
    const params = {
      marketingStaffId: marketingStaffId
    };
    
    // Add verification status filter if provided
    if (filters.verificationStatus) {
      query += ' AND verification_status = @verificationStatus';
      params.verificationStatus = filters.verificationStatus;
    }
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND activity_date >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND activity_date <= @endDate';
      params.endDate = filters.endDate;
    }
    
    // Add activity type filter if provided
    if (filters.activityType) {
      query += ' AND activity_type = @activityType';
      params.activityType = filters.activityType;
    }
    
    query += ' ORDER BY activity_date DESC';
    
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
    console.error('Error getting marketing incentives by staff:', error);
    return [];
  }
}

/**
 * Get marketing incentives by verification status
 * @param {string} verificationStatus - Verification status
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of incentive records
 */
async function getMarketingIncentivesByVerificationStatus(verificationStatus, filters = {}) {
  try {
    let query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.marketing_staff_incentives\`
      WHERE verification_status = @verificationStatus
    `;
    
    const params = {
      verificationStatus: verificationStatus
    };
    
    // Add marketing staff ID filter if provided
    if (filters.marketingStaffId) {
      query += ' AND marketing_staff_id = @marketingStaffId';
      params.marketingStaffId = filters.marketingStaffId;
    }
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND activity_date >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND activity_date <= @endDate';
      params.endDate = filters.endDate;
    }
    
    query += ' ORDER BY activity_date DESC';
    
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
    console.error('Error getting marketing incentives by verification status:', error);
    return [];
  }
}

/**
 * Update marketing incentive verification status
 * @param {string} incentiveId - Incentive ID
 * @param {string} status - Verification status
 * @param {Object} updateData - Additional data to update
 * @returns {boolean} Success flag
 */
async function updateMarketingIncentiveVerificationStatus(incentiveId, status, updateData = {}) {
  try {
    // Build update query dynamically
    const fields = [`verification_status = @verification_status`, `verified_at = @verified_at`];
    const params = {
      incentiveId: incentiveId,
      verification_status: status,
      verified_at: new Date().toISOString()
    };
    
    // Add additional fields if provided
    if (updateData.verifiedBy) {
      fields.push('verified_by = @verified_by');
      params.verified_by = updateData.verifiedBy;
    }
    
    if (updateData.verificationNotes) {
      fields.push('verification_notes = @verification_notes');
      params.verification_notes = updateData.verificationNotes;
    }
    
    // Add other fields as needed
    for (const [key, value] of Object.entries(updateData)) {
      if (!['verifiedBy', 'verificationNotes']) {
        // Map camelCase to snake_case for BigQuery fields
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbField} = @${key}`);
        params[key] = value;
      }
    }
    
    const query = `
      UPDATE \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.marketing_staff_incentives\`
      SET ${fields.join(', ')}
      WHERE incentive_id = @incentiveId
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    await bigquery.createQueryJob(options);
    
    return true;
  } catch (error) {
    console.error('Error updating marketing incentive verification status:', error);
    return false;
  }
}

/**
 * Get marketing incentive summary for a staff member
 * @param {string} marketingStaffId - Marketing staff ID
 * @param {Object} filters - Additional filters
 * @returns {Object|null} Incentive summary or null if not found
 */
async function getMarketingIncentiveSummary(marketingStaffId, filters = {}) {
  try {
    let query = `
      SELECT 
        marketing_staff_id,
        marketing_staff_name,
        COUNT(*) as total_incentives,
        SUM(incentive_amount_bdt) as total_incentive_amount_bdt,
        COUNTIF(verification_status = 'PENDING') as pending_incentives,
        COUNTIF(verification_status = 'VERIFIED') as verified_incentives,
        COUNTIF(verification_status = 'REJECTED') as rejected_incentives,
        COUNTIF(activity_type = 'VISIT') as visit_activities,
        COUNTIF(activity_type = 'MEETING') as meeting_activities,
        COUNTIF(activity_type = 'DEMO') as demo_activities,
        MIN(activity_date) as first_activity_date,
        MAX(activity_date) as last_activity_date
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.marketing_staff_incentives\`
      WHERE marketing_staff_id = @marketingStaffId
    `;
    
    const params = {
      marketingStaffId: marketingStaffId
    };
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND activity_date >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND activity_date <= @endDate';
      params.endDate = filters.endDate;
    }
    
    query += ' GROUP BY marketing_staff_id, marketing_staff_name';
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting marketing incentive summary:', error);
    return null;
  }
}

/**
 * Get pending marketing incentives for verification
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of pending incentive records
 */
async function getPendingMarketingIncentives(filters = {}) {
  try {
    let query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.marketing_staff_incentives\`
      WHERE verification_status = 'PENDING'
    `;
    
    const params = {};
    
    // Add marketing staff ID filter if provided
    if (filters.marketingStaffId) {
      query += ' AND marketing_staff_id = @marketingStaffId';
      params.marketingStaffId = filters.marketingStaffId;
    }
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND activity_date >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND activity_date <= @endDate';
      params.endDate = filters.endDate;
    }
    
    query += ' ORDER BY activity_date ASC';
    
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
    console.error('Error getting pending marketing incentives:', error);
    return [];
  }
}

/**
 * Get marketing incentives by challan number
 * @param {string} challanNumber - Challan number
 * @returns {Array} Array of incentive records
 */
async function getMarketingIncentivesByChallan(challanNumber) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.marketing_staff_incentives\`
      WHERE challan_number = @challanNumber
      ORDER BY activity_date DESC
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
    console.error('Error getting marketing incentives by challan:', error);
    return [];
  }
}

// Export functions
module.exports = {
  recordMarketingIncentive,
  getMarketingIncentive,
  getMarketingIncentivesByStaff,
  getMarketingIncentivesByVerificationStatus,
  updateMarketingIncentiveVerificationStatus,
  getMarketingIncentiveSummary,
  getPendingMarketingIncentives,
  getMarketingIncentivesByChallan
};