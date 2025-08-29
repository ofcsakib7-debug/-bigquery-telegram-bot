/**
 * Dealer Payment Management System
 * 
 * This module implements the dealer payment functionality
 * as specified in Design 11.
 */

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Record a dealer payment
 * @param {Object} paymentData - Payment data
 * @returns {string} Payment ID
 */
async function recordDealerPayment(paymentData) {
  try {
    // Generate payment ID
    const paymentId = `PAY-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Set payment for month to first day of the month
    const paymentForMonth = new Date(paymentData.paymentForMonth || new Date());
    paymentForMonth.setDate(1);
    
    // Set values
    const payment = {
      payment_id: paymentId,
      dealer_id: paymentData.dealerId,
      dealer_name: paymentData.dealerName,
      challan_number: paymentData.challanNumber || null,
      payment_timestamp: paymentData.paymentTimestamp || new Date().toISOString(),
      payment_method: paymentData.paymentMethod,
      bank_account_number: paymentData.bankAccountNumber || null,
      payment_amount_bdt: paymentData.paymentAmountBdt,
      receiving_branch_id: paymentData.receivingBranchId,
      payment_for_month: paymentForMonth.toISOString().split('T')[0],
      payment_type: paymentData.paymentType || 'AGAINST_CHALLAN',
      approved_by: paymentData.approvedBy || null,
      initiated_by: paymentData.initiatedBy || null,
      notes: paymentData.notes || null,
      created_at: new Date().toISOString()
    };
    
    // Insert payment journal entry
    const query = `
      INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_payment_journal\`
      (payment_id, dealer_id, dealer_name, challan_number, payment_timestamp, payment_method,
       bank_account_number, payment_amount_bdt, receiving_branch_id, payment_for_month,
       payment_type, approved_by, initiated_by, notes, created_at)
      VALUES
      (@payment_id, @dealer_id, @dealer_name, @challan_number, @payment_timestamp, @payment_method,
       @bank_account_number, @payment_amount_bdt, @receiving_branch_id, @payment_for_month,
       @payment_type, @approved_by, @initiated_by, @notes, @created_at)
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: payment
    };
    
    await bigquery.createQueryJob(options);
    
    return paymentId;
  } catch (error) {
    console.error('Error recording dealer payment:', error);
    throw error;
  }
}

/**
 * Get dealer payment by ID
 * @param {string} paymentId - Payment ID
 * @returns {Object|null} Payment record or null if not found
 */
async function getDealerPayment(paymentId) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_payment_journal\`
      WHERE payment_id = @paymentId
      LIMIT 1
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        paymentId: paymentId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting dealer payment:', error);
    return null;
  }
}

/**
 * Get dealer payments by dealer ID
 * @param {string} dealerId - Dealer ID
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of payment records
 */
async function getDealerPaymentsByDealer(dealerId, filters = {}) {
  try {
    let query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_payment_journal\`
      WHERE dealer_id = @dealerId
    `;
    
    const params = {
      dealerId: dealerId
    };
    
    // Add payment type filter if provided
    if (filters.paymentType) {
      query += ' AND payment_type = @paymentType';
      params.paymentType = filters.paymentType;
    }
    
    // Add payment method filter if provided
    if (filters.paymentMethod) {
      query += ' AND payment_method = @paymentMethod';
      params.paymentMethod = filters.paymentMethod;
    }
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND DATE(payment_timestamp) >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND DATE(payment_timestamp) <= @endDate';
      params.endDate = filters.endDate;
    }
    
    // Add challan number filter if provided
    if (filters.challanNumber) {
      query += ' AND challan_number = @challanNumber';
      params.challanNumber = filters.challanNumber;
    }
    
    query += ' ORDER BY payment_timestamp DESC';
    
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
    console.error('Error getting dealer payments by dealer:', error);
    return [];
  }
}

/**
 * Get dealer payments by branch ID
 * @param {string} branchId - Branch ID
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of payment records
 */
async function getDealerPaymentsByBranch(branchId, filters = {}) {
  try {
    let query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_payment_journal\`
      WHERE receiving_branch_id = @branchId
    `;
    
    const params = {
      branchId: branchId
    };
    
    // Add payment type filter if provided
    if (filters.paymentType) {
      query += ' AND payment_type = @paymentType';
      params.paymentType = filters.paymentType;
    }
    
    // Add payment method filter if provided
    if (filters.paymentMethod) {
      query += ' AND payment_method = @paymentMethod';
      params.paymentMethod = filters.paymentMethod;
    }
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND DATE(payment_timestamp) >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND DATE(payment_timestamp) <= @endDate';
      params.endDate = filters.endDate;
    }
    
    query += ' ORDER BY payment_timestamp DESC';
    
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
    console.error('Error getting dealer payments by branch:', error);
    return [];
  }
}

/**
 * Get dealer payment summary
 * @param {string} dealerId - Dealer ID
 * @param {Object} filters - Additional filters
 * @returns {Object|null} Payment summary or null if not found
 */
async function getDealerPaymentSummary(dealerId, filters = {}) {
  try {
    let query = `
      SELECT 
        dealer_id,
        dealer_name,
        COUNT(*) as total_payments,
        SUM(payment_amount_bdt) as total_payment_amount_bdt,
        AVG(payment_amount_bdt) as average_payment_amount_bdt,
        MIN(payment_timestamp) as first_payment_date,
        MAX(payment_timestamp) as last_payment_date
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_payment_journal\`
      WHERE dealer_id = @dealerId
    `;
    
    const params = {
      dealerId: dealerId
    };
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND DATE(payment_timestamp) >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND DATE(payment_timestamp) <= @endDate';
      params.endDate = filters.endDate;
    }
    
    query += ' GROUP BY dealer_id, dealer_name';
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting dealer payment summary:', error);
    return null;
  }
}

/**
 * Get outstanding payments for a dealer
 * @param {string} dealerId - Dealer ID
 * @returns {Object|null} Outstanding payment information or null if not found
 */
async function getDealerOutstandingPayments(dealerId) {
  try {
    const query = `
      SELECT 
        dealer_id,
        dealer_name,
        COALESCE(SUM(payment_amount_bdt), 0) as total_outstanding_bdt,
        COUNT(*) as outstanding_payment_count
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_payment_journal\`
      WHERE dealer_id = @dealerId
      GROUP BY dealer_id, dealer_name
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        dealerId: dealerId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting dealer outstanding payments:', error);
    return null;
  }
}

/**
 * Get payment statistics
 * @param {Object} filters - Additional filters
 * @returns {Object|null} Payment statistics or null if not found
 */
async function getPaymentStatistics(filters = {}) {
  try {
    let query = `
      SELECT 
        COUNT(*) as total_payments,
        SUM(payment_amount_bdt) as total_payment_amount_bdt,
        AVG(payment_amount_bdt) as average_payment_amount_bdt,
        COUNTIF(payment_type = 'ADVANCE') as advance_payments,
        COUNTIF(payment_type = 'AGAINST_CHALLAN') as challan_payments,
        COUNTIF(payment_type = 'SETTLEMENT') as settlement_payments,
        COUNTIF(payment_method = 'CASH') as cash_payments,
        COUNTIF(payment_method = 'BANK_TRANSFER') as bank_transfer_payments,
        COUNTIF(payment_method = 'MOBILE_BANKING') as mobile_banking_payments
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_payment_journal\`
    `;
    
    const params = {};
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' WHERE DATE(payment_timestamp) >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      if (filters.startDate) {
        query += ' AND DATE(payment_timestamp) <= @endDate';
      } else {
        query += ' WHERE DATE(payment_timestamp) <= @endDate';
      }
      params.endDate = filters.endDate;
    }
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting payment statistics:', error);
    return null;
  }
}

/**
 * Get dealers with pending payments
 * @param {number} daysOverdue - Minimum days overdue
 * @returns {Array} Array of dealers with pending payments
 */
async function getDealersWithPendingPayments(daysOverdue = 30) {
  try {
    const query = `
      SELECT 
        dpj.dealer_id,
        dpj.dealer_name,
        COUNT(*) as pending_payment_count,
        SUM(dpj.payment_amount_bdt) as total_pending_amount_bdt,
        MAX(dpj.payment_timestamp) as last_payment_date
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_payment_journal\` dpj
      WHERE dpj.payment_type = 'AGAINST_CHALLAN'
        AND DATE_DIFF(CURRENT_DATE(), DATE(dpj.payment_timestamp), DAY) > @daysOverdue
      GROUP BY dpj.dealer_id, dpj.dealer_name
      ORDER BY total_pending_amount_bdt DESC
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        daysOverdue: daysOverdue
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting dealers with pending payments:', error);
    return [];
  }
}

// Export functions
module.exports = {
  recordDealerPayment,
  getDealerPayment,
  getDealerPaymentsByDealer,
  getDealerPaymentsByBranch,
  getDealerPaymentSummary,
  getDealerOutstandingPayments,
  getPaymentStatistics,
  getDealersWithPendingPayments
};