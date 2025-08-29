/**
 * Dealer Credit Management System
 * 
 * This module implements the dealer credit management functionality
 * as specified in Design 11.
 */

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Create or update dealer credit terms
 * @param {Object} creditData - Credit terms data
 * @returns {string} Credit ID
 */
async function setDealerCreditTerms(creditData) {
  try {
    // Generate credit ID
    const creditId = `CREDIT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Set default values
    const credit = {
      credit_id: creditId,
      dealer_id: creditData.dealerId,
      credit_limit_bdt: creditData.creditLimitBdt,
      credit_days: creditData.creditDays,
      interest_rate_per_day: creditData.interestRatePerDay,
      discount_structure: JSON.stringify(creditData.discountStructure || {}),
      minimum_order_value_bdt: creditData.minimumOrderValueBdt,
      last_credit_review: creditData.lastCreditReview || new Date().toISOString().split('T')[0],
      credit_score: creditData.creditScore || 50.0,
      credit_risk_category: creditData.creditRiskCategory || 'MEDIUM',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Check if credit terms already exist for this dealer
    const existing = await getDealerCreditTerms(creditData.dealerId);
    
    if (existing) {
      // Update existing record
      const query = `
        UPDATE \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_credit_terms\`
        SET 
          credit_limit_bdt = @credit_limit_bdt,
          credit_days = @credit_days,
          interest_rate_per_day = @interest_rate_per_day,
          discount_structure = @discount_structure,
          minimum_order_value_bdt = @minimum_order_value_bdt,
          last_credit_review = @last_credit_review,
          credit_score = @credit_score,
          credit_risk_category = @credit_risk_category,
          updated_at = @updated_at
        WHERE dealer_id = @dealer_id
      `;
      
      const options = {
        query: query,
        location: 'US',
        params: {
          dealer_id: credit.dealer_id,
          credit_limit_bdt: credit.credit_limit_bdt,
          credit_days: credit.credit_days,
          interest_rate_per_day: credit.interest_rate_per_day,
          discount_structure: credit.discount_structure,
          minimum_order_value_bdt: credit.minimum_order_value_bdt,
          last_credit_review: credit.last_credit_review,
          credit_score: credit.credit_score,
          credit_risk_category: credit.credit_risk_category,
          updated_at: credit.updated_at
        }
      };
      
      await bigquery.createQueryJob(options);
    } else {
      // Insert new record
      const query = `
        INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_credit_terms\`
        (credit_id, dealer_id, credit_limit_bdt, credit_days, interest_rate_per_day, discount_structure,
         minimum_order_value_bdt, last_credit_review, credit_score, credit_risk_category, created_at, updated_at)
        VALUES
        (@credit_id, @dealer_id, @credit_limit_bdt, @credit_days, @interest_rate_per_day, @discount_structure,
         @minimum_order_value_bdt, @last_credit_review, @credit_score, @credit_risk_category, @created_at, @updated_at)
      `;
      
      const options = {
        query: query,
        location: 'US',
        params: credit
      };
      
      await bigquery.createQueryJob(options);
    }
    
    return creditId;
  } catch (error) {
    console.error('Error setting dealer credit terms:', error);
    throw error;
  }
}

/**
 * Get dealer credit terms by dealer ID
 * @param {string} dealerId - Dealer ID
 * @returns {Object|null} Credit terms or null if not found
 */
async function getDealerCreditTerms(dealerId) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_credit_terms\`
      WHERE dealer_id = @dealerId
      LIMIT 1
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
    
    if (rows.length > 0) {
      // Parse JSON discount structure
      const creditTerms = rows[0];
      if (creditTerms.discount_structure) {
        creditTerms.discount_structure = JSON.parse(creditTerms.discount_structure);
      }
      return creditTerms;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting dealer credit terms:', error);
    return null;
  }
}

/**
 * Check if dealer has sufficient credit for a transaction
 * @param {string} dealerId - Dealer ID
 * @param {number} transactionAmount - Transaction amount
 * @returns {Object} Credit check result
 */
async function checkDealerCredit(dealerId, transactionAmount) {
  try {
    // Get dealer credit info
    const creditInfo = await getDealerCreditTerms(dealerId);
    
    if (!creditInfo) {
      return {
        sufficient_credit: false,
        error: 'Dealer not found'
      };
    }
    
    // Get current outstanding amount from payments
    const outstandingQuery = `
      SELECT COALESCE(SUM(payment_amount_bdt), 0) as current_outstanding_bdt
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_payment_journal\`
      WHERE dealer_id = @dealerId
    `;
    
    const outstandingOptions = {
      query: outstandingQuery,
      location: 'US',
      params: {
        dealerId: dealerId
      }
    };
    
    const [outstandingJob] = await bigquery.createQueryJob(outstandingOptions);
    const [outstandingRows] = await outstandingJob.getQueryResults();
    
    const currentOutstanding = outstandingRows.length > 0 ? parseFloat(outstandingRows[0].current_outstanding_bdt) : 0;
    const availableCredit = creditInfo.credit_limit_bdt - currentOutstanding;
    const creditUtilizationPercent = (currentOutstanding / creditInfo.credit_limit_bdt) * 100;
    
    // Check if sufficient credit
    if (availableCredit < transactionAmount) {
      return {
        sufficient_credit: false,
        available_credit: availableCredit,
        current_outstanding: currentOutstanding,
        credit_limit: creditInfo.credit_limit_bdt,
        credit_utilization_percent: creditUtilizationPercent,
        transaction_amount: transactionAmount,
        shortfall: transactionAmount - availableCredit
      };
    }
    
    return {
      sufficient_credit: true,
      available_credit: availableCredit,
      current_outstanding: currentOutstanding,
      credit_limit: creditInfo.credit_limit_bdt,
      credit_utilization_percent: creditUtilizationPercent,
      transaction_amount: transactionAmount
    };
  } catch (error) {
    console.error('Error checking dealer credit:', error);
    return {
      sufficient_credit: false,
      error: 'Error checking credit'
    };
  }
}

/**
 * Get dealers by credit risk category
 * @param {string} riskCategory - Credit risk category (LOW, MEDIUM, HIGH)
 * @returns {Array} Array of dealer credit terms
 */
async function getDealersByCreditRisk(riskCategory) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_credit_terms\`
      WHERE credit_risk_category = @riskCategory
      ORDER BY credit_score ASC
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        riskCategory: riskCategory
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    // Parse JSON discount structures
    return rows.map(row => {
      if (row.discount_structure) {
        row.discount_structure = JSON.parse(row.discount_structure);
      }
      return row;
    });
  } catch (error) {
    console.error('Error getting dealers by credit risk:', error);
    return [];
  }
}

/**
 * Get dealers with high credit utilization
 * @param {number} thresholdPercent - Credit utilization threshold percentage
 * @returns {Array} Array of dealer credit terms
 */
async function getDealersWithHighCreditUtilization(thresholdPercent = 80) {
  try {
    const query = `
      SELECT 
        dct.*,
        COALESCE(SUM(dpj.payment_amount_bdt), 0) as current_outstanding_bdt,
        (COALESCE(SUM(dpj.payment_amount_bdt), 0) / dct.credit_limit_bdt) * 100 as credit_utilization_percent
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_credit_terms\` dct
      LEFT JOIN \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_payment_journal\` dpj
        ON dct.dealer_id = dpj.dealer_id
      GROUP BY 
        dct.credit_id, dct.dealer_id, dct.credit_limit_bdt, dct.credit_days, dct.interest_rate_per_day,
        dct.discount_structure, dct.minimum_order_value_bdt, dct.last_credit_review, dct.credit_score,
        dct.credit_risk_category, dct.created_at, dct.updated_at
      HAVING credit_utilization_percent > @thresholdPercent
      ORDER BY credit_utilization_percent DESC
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        thresholdPercent: thresholdPercent
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    // Parse JSON discount structures
    return rows.map(row => {
      if (row.discount_structure) {
        row.discount_structure = JSON.parse(row.discount_structure);
      }
      return row;
    });
  } catch (error) {
    console.error('Error getting dealers with high credit utilization:', error);
    return [];
  }
}

/**
 * Update dealer credit score
 * @param {string} dealerId - Dealer ID
 * @param {number} newScore - New credit score (0-100)
 * @returns {boolean} Success flag
 */
async function updateDealerCreditScore(dealerId, newScore) {
  try {
    // Determine credit risk category based on score
    let riskCategory;
    if (newScore >= 80) {
      riskCategory = 'LOW';
    } else if (newScore >= 50) {
      riskCategory = 'MEDIUM';
    } else {
      riskCategory = 'HIGH';
    }
    
    const query = `
      UPDATE \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_credit_terms\`
      SET 
        credit_score = @credit_score,
        credit_risk_category = @credit_risk_category,
        last_credit_review = @last_credit_review,
        updated_at = @updated_at
      WHERE dealer_id = @dealer_id
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        dealer_id: dealerId,
        credit_score: newScore,
        credit_risk_category: riskCategory,
        last_credit_review: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString()
      }
    };
    
    await bigquery.createQueryJob(options);
    
    return true;
  } catch (error) {
    console.error('Error updating dealer credit score:', error);
    return false;
  }
}

// Export functions
module.exports = {
  setDealerCreditTerms,
  getDealerCreditTerms,
  checkDealerCredit,
  getDealersByCreditRisk,
  getDealersWithHighCreditUtilization,
  updateDealerCreditScore
};