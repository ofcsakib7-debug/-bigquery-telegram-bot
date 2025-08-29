/**
 * Customer Payment Management System
 * 
 * This module implements the customer payment management functionality
 * as specified in Design 10.
 */

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Get customer ledger information
 * @param {string} customerId - Customer ID
 * @returns {Object|null} Customer ledger information or null if not found
 */
async function getCustomerLedger(customerId) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.crm_customer_ledger\`
      WHERE customer_id = @customerId
      ORDER BY last_updated DESC
      LIMIT 1
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        customerId: customerId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting customer ledger:', error);
    return null;
  }
}

/**
 * Get customer reliability score
 * @param {string} customerId - Customer ID
 * @returns {number|null} Customer reliability score or null if not found
 */
async function getCustomerReliabilityScore(customerId) {
  try {
    const ledger = await getCustomerLedger(customerId);
    return ledger ? ledger.customer_reliability_score : null;
  } catch (error) {
    console.error('Error getting customer reliability score:', error);
    return null;
  }
}

/**
 * Get customers by reliability score range
 * @param {number} minScore - Minimum reliability score
 * @param {number} maxScore - Maximum reliability score
 * @returns {Array} Array of customers
 */
async function getCustomersByReliabilityScore(minScore, maxScore) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.crm_customer_ledger\`
      WHERE customer_reliability_score BETWEEN @minScore AND @maxScore
      ORDER BY customer_reliability_score ASC
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        minScore: minScore,
        maxScore: maxScore
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting customers by reliability score:', error);
    return [];
  }
}

/**
 * Update customer ledger information
 * @param {string} customerId - Customer ID
 * @param {Object} ledgerData - Ledger data to update
 * @returns {boolean} Success flag
 */
async function updateCustomerLedger(customerId, ledgerData) {
  try {
    // Check if customer exists
    const existing = await getCustomerLedger(customerId);
    
    if (existing) {
      // Update existing record
      const query = `
        UPDATE \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.crm_customer_ledger\`
        SET 
          customer_name = @customer_name,
          total_due_amount = @total_due_amount,
          avg_days_to_pay = @avg_days_to_pay,
          on_time_payment_rate = @on_time_payment_rate,
          customer_reliability_score = @customer_reliability_score,
          machine_breakdown_rate = @machine_breakdown_rate,
          service_request_frequency = @service_request_frequency,
          recommended_credit_limit_bdt = @recommended_credit_limit_bdt,
          last_updated = @last_updated
        WHERE customer_id = @customer_id
      `;
      
      const options = {
        query: query,
        location: 'US',
        params: {
          customer_id: customerId,
          ...ledgerData,
          last_updated: new Date().toISOString()
        }
      };
      
      await bigquery.createQueryJob(options);
    } else {
      // Insert new record
      const query = `
        INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.crm_customer_ledger\`
        (customer_id, customer_name, total_due_amount, avg_days_to_pay, on_time_payment_rate, 
         customer_reliability_score, machine_breakdown_rate, service_request_frequency, 
         recommended_credit_limit_bdt, last_updated, created_at)
        VALUES
        (@customer_id, @customer_name, @total_due_amount, @avg_days_to_pay, @on_time_payment_rate, 
         @customer_reliability_score, @machine_breakdown_rate, @service_request_frequency, 
         @recommended_credit_limit_bdt, @last_updated, @created_at)
      `;
      
      const options = {
        query: query,
        location: 'US',
        params: {
          customer_id: customerId,
          ...ledgerData,
          last_updated: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      };
      
      await bigquery.createQueryJob(options);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating customer ledger:', error);
    return false;
  }
}

/**
 * Get customer payment statistics
 * @param {string} customerId - Customer ID
 * @returns {Object|null} Payment statistics or null if not found
 */
async function getCustomerPaymentStats(customerId) {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_transactions,
        AVG(avg_days_to_pay) as average_days_to_pay,
        AVG(on_time_payment_rate) as average_on_time_rate,
        MIN(customer_reliability_score) as min_reliability_score,
        MAX(customer_reliability_score) as max_reliability_score
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.crm_customer_ledger\`
      WHERE customer_id = @customerId
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        customerId: customerId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting customer payment stats:', error);
    return null;
  }
}

/**
 * Get top customers by reliability score
 * @param {number} limit - Number of customers to return
 * @returns {Array} Array of top customers
 */
async function getTopCustomersByReliability(limit = 10) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.crm_customer_ledger\`
      ORDER BY customer_reliability_score ASC
      LIMIT @limit
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        limit: limit
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting top customers by reliability:', error);
    return [];
  }
}

/**
 * Get customers with overdue payments
 * @param {number} daysOverdue - Minimum days overdue
 * @returns {Array} Array of customers with overdue payments
 */
async function getCustomersWithOverduePayments(daysOverdue = 0) {
  try {
    const query = `
      SELECT c.*, d.due_date, d.due_amount
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.crm_customer_ledger\` c
      JOIN \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.due_payment_cache\` d
        ON c.customer_id = d.entity_id
      WHERE d.entity_type = 'CUSTOMER'
        AND d.status = 'OVERDUE'
        AND DATE_DIFF(CURRENT_DATE(), d.due_date, DAY) >= @daysOverdue
      ORDER BY d.due_date ASC
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
    console.error('Error getting customers with overdue payments:', error);
    return [];
  }
}

// Export functions
module.exports = {
  getCustomerLedger,
  getCustomerReliabilityScore,
  getCustomersByReliabilityScore,
  updateCustomerLedger,
  getCustomerPaymentStats,
  getTopCustomersByReliability,
  getCustomersWithOverduePayments
};
