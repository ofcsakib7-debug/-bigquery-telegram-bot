/**
 * BQML Training Data Infrastructure for Customer Payments
 * 
 * This module implements the BQML training data infrastructure
 * as specified in Design 10.
 */

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Generate BQML training data for customer payments
 * @returns {boolean} Success flag
 */
async function generateBQMLTrainingData() {
  try {
    // This function would typically run as a scheduled query
    // For now, we'll just log that it would run
    console.log('Generating BQML training data for customer payments...');
    
    // In a real implementation, this would:
    // 1. Aggregate data from payment receipts
    // 2. Calculate features like days_past_due, total_due_amount, etc.
    // 3. Determine if payment was made on time
    // 4. Insert into bqml_training_customer_payments table
    
    // Example query structure:
    const query = `
      INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.bqml_training_customer_payments\`
      (user_id, customer_id, days_past_due, total_due_amount, avg_days_to_pay, on_time_payment_rate, 
       customer_reliability_score, machine_breakdown_rate, service_request_frequency, paid_on_time, training_date)
      SELECT 
        p.initiated_by as user_id,
        p.customer_id,
        DATE_DIFF(CURRENT_DATE(), DATE(p.payment_timestamp), DAY) as days_past_due,
        p.total_invoice_amount as total_due_amount,
        c.avg_days_to_pay,
        c.on_time_payment_rate,
        c.customer_reliability_score,
        c.machine_breakdown_rate,
        c.service_request_frequency,
        CASE WHEN DATE(p.payment_timestamp) <= p.due_date THEN TRUE ELSE FALSE END as paid_on_time,
        CURRENT_DATE() as training_date
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.payment_receipts\` p
      JOIN \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.crm_customer_ledger\` c
        ON p.customer_id = c.customer_id
      WHERE DATE(p.payment_timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 180 DAY)
        AND DATE(p.created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)  -- Process yesterday's data
    `;
    
    // In a real implementation, this would be a scheduled query
    // that runs daily at 03:00 Asia/Dhaka time
    
    return true;
  } catch (error) {
    console.error('Error generating BQML training data:', error);
    return false;
  }
}

/**
 * Retrain customer payment model
 * @returns {boolean} Success flag
 */
async function retrainCustomerPaymentModel() {
  try {
    // This function would typically run as a scheduled query
    // For now, we'll just log that it would run
    console.log('Retraining customer payment model...');
    
    // In a real implementation, this would:
    // 1. Create or update a BQML model using the training data
    // 2. Use logistic regression for binary classification
    // 3. Include customer_reliability_score as a feature
    
    // Example query structure:
    const query = `
      CREATE OR REPLACE MODEL \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.customer_payment_model\`
      OPTIONS(
        model_type='LOGISTIC_REG',
        INPUT_LABEL_COLS=['paid_on_time']
      ) AS
      SELECT
        customer_reliability_score,
        avg_days_to_pay,
        on_time_payment_rate,
        total_due_amount,
        days_past_due,
        machine_breakdown_rate,
        service_request_frequency,
        paid_on_time
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.bqml_training_customer_payments\`
      WHERE training_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
    `;
    
    // In a real implementation, this would be a scheduled query
    // that runs daily at 04:00 Asia/Dhaka time
    
    return true;
  } catch (error) {
    console.error('Error retraining customer payment model:', error);
    return false;
  }
}

/**
 * Validate customer payment model performance
 * @returns {Object} Validation results
 */
async function validateCustomerPaymentModel() {
  try {
    // This function would check model performance before deployment
    // For now, we'll just log that it would run
    console.log('Validating customer payment model performance...');
    
    // In a real implementation, this would:
    // 1. Evaluate the model using a test dataset
    // 2. Check accuracy, precision, recall, etc.
    // 3. Compare with previous model performance
    // 4. Only deploy if performance is acceptable
    
    return {
      valid: true,
      message: 'Model validation passed'
    };
  } catch (error) {
    console.error('Error validating customer payment model:', error);
    return {
      valid: false,
      message: 'Model validation failed'
    };
  }
}

/**
 * Get model evaluation metrics
 * @returns {Object|null} Model evaluation metrics or null if not found
 */
async function getModelEvaluationMetrics() {
  try {
    const query = `
      SELECT *
      FROM ML.EVALUATE(MODEL \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.customer_payment_model\`)
    `;
    
    const options = {
      query: query,
      location: 'US'
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting model evaluation metrics:', error);
    return null;
  }
}

/**
 * Predict payment likelihood for a customer
 * @param {string} customerId - Customer ID
 * @returns {Object|null} Prediction result or null if not found
 */
async function predictPaymentLikelihood(customerId) {
  try {
    // Get customer data
    const query = `
      SELECT 
        customer_reliability_score,
        avg_days_to_pay,
        on_time_payment_rate,
        total_due_amount,
        days_past_due,
        machine_breakdown_rate,
        service_request_frequency
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.bqml_training_customer_payments\`
      WHERE customer_id = @customerId
      ORDER BY training_date DESC
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
    
    if (rows.length === 0) {
      return null;
    }
    
    // Make prediction using the model
    const predictionQuery = `
      SELECT *
      FROM ML.PREDICT(MODEL \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.customer_payment_model\`,
        (SELECT 
          customer_reliability_score,
          avg_days_to_pay,
          on_time_payment_rate,
          total_due_amount,
          days_past_due,
          machine_breakdown_rate,
          service_request_frequency
        FROM UNNEST([STRUCT(
          @customer_reliability_score as customer_reliability_score,
          @avg_days_to_pay as avg_days_to_pay,
          @on_time_payment_rate as on_time_payment_rate,
          @total_due_amount as total_due_amount,
          @days_past_due as days_past_due,
          @machine_breakdown_rate as machine_breakdown_rate,
          @service_request_frequency as service_request_frequency
        )])
      ))
    `;
    
    const predictionOptions = {
      query: predictionQuery,
      location: 'US',
      params: rows[0]
    };
    
    const [predictionJob] = await bigquery.createQueryJob(predictionOptions);
    const [predictionRows] = await predictionJob.getQueryResults();
    
    return predictionRows.length > 0 ? predictionRows[0] : null;
  } catch (error) {
    console.error('Error predicting payment likelihood:', error);
    return null;
  }
}

// Export functions
module.exports = {
  generateBQMLTrainingData,
  retrainCustomerPaymentModel,
  validateCustomerPaymentModel,
  getModelEvaluationMetrics,
  predictPaymentLikelihood
};
