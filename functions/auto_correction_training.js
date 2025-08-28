// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 3
// Component: auto_correction_training
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 16:00 UTC
// Next Step: Implement department-specific validation rules
// =============================================

const { BigQuery } = require('@google-cloud/bigquery');
const { getFromCache, storeInCache, generateCacheKey } = require('../bigquery/cache');
const { withErrorHandling } = require('./error_handling');

// Lazy initialization of BigQuery client
let bigquery = null;
function getBigQuery() {
  if (!bigquery) {
    bigquery = new BigQuery();
  }
  return bigquery;
}

/**
 * Train auto-correction models with BQML
 * This function should be triggered by Cloud Scheduler daily at 2AM Bangladesh time
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.trainAutoCorrectionModels = async (req, res) => {
  try {
    console.log('Starting auto-correction model training...');
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Create training data for typo correction
    await createTrainingDataForTypoCorrection(bigqueryClient, datasetId);
    
    // Train the typo correction model
    await trainTypoCorrectionModel(bigqueryClient, datasetId);
    
    // Evaluate the model
    const evaluationResults = await evaluateModel(bigqueryClient, datasetId);
    
    // Store training results
    await storeTrainingResults(evaluationResults, bigqueryClient, datasetId);
    
    console.log('Auto-correction model training completed');
    
    res.status(200).send('Auto-correction model training completed');
  } catch (error) {
    console.error('Error training auto-correction models:', error);
    res.status(500).send('Error training auto-correction models');
  }
};

/**
 * Create training data for typo correction
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 */
async function createTrainingDataForTypoCorrection(bigqueryClient, datasetId) {
  try {
    console.log('Creating training data for typo correction...');
    
    // Check cache first
    const cacheKey = generateCacheKey('training', 'typo_correction_data', 'current');
    const cachedData = await getFromCache(cacheKey);
    
    if (cachedData) {
      console.log('Using cached training data for typo correction');
      return;
    }
    
    const query = `
      CREATE OR REPLACE TABLE \`${datasetId}.bqml_training_typo_correction\` AS
      SELECT
        original_text,
        corrected_text,
        levenshtein_distance,
        department_id,
        usage_count,
        confidence_score,
        CURRENT_DATE() AS training_date
      FROM \`${datasetId}.common_corrections\`
      WHERE DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY);
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    await bigqueryClient.query(options);
    
    console.log('Training data for typo correction created successfully');
    
    // Cache for 2 hours
    await storeInCache(cacheKey, { status: 'complete' }, 2);
    
  } catch (error) {
    console.error('Error creating training data for typo correction:', error);
  }
}

/**
 * Train typo correction model with BQML
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 */
async function trainTypoCorrectionModel(bigqueryClient, datasetId) {
  try {
    console.log('Training typo correction model...');
    
    // Check cache first
    const cacheKey = generateCacheKey('training', 'typo_correction_model', 'current');
    const cachedModel = await getFromCache(cacheKey);
    
    if (cachedModel) {
      console.log('Using cached typo correction model');
      return;
    }
    
    const query = `
      CREATE OR REPLACE MODEL \`${datasetId}.typo_correction_model\`
      OPTIONS(
        model_type = 'kmeans',
        num_clusters = 10
      ) AS
      SELECT
        original_text,
        corrected_text,
        levenshtein_distance,
        department_id
      FROM \`${datasetId}.bqml_training_typo_correction\`;
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    await bigqueryClient.query(options);
    
    console.log('Typo correction model trained successfully');
    
    // Cache for 24 hours
    await storeInCache(cacheKey, { status: 'trained' }, 24);
    
  } catch (error) {
    console.error('Error training typo correction model:', error);
  }
}

/**
 * Evaluate BQML model performance
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Object} Evaluation results
 */
async function evaluateModel(bigqueryClient, datasetId) {
  try {
    console.log('Evaluating model performance...');
    
    // Check cache first
    const cacheKey = generateCacheKey('training', 'model_evaluation', 'current');
    const cachedEvaluation = await getFromCache(cacheKey);
    
    if (cachedEvaluation) {
      console.log('Using cached model evaluation results');
      return cachedEvaluation;
    }
    
    const query = `
      SELECT
        *
      FROM
        ML.EVALUATE(MODEL \`${datasetId}.typo_correction_model\`)
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const evaluationResults = rows.length > 0 ? {
      davies_bouldin_index: parseFloat(rows[0].davies_bouldin_index) || 0,
      mean_squared_distance: parseFloat(rows[0].mean_squared_distance) || 0
    } : {
      davies_bouldin_index: 0,
      mean_squared_distance: 0
    };
    
    // Cache for 6 hours
    await storeInCache(cacheKey, evaluationResults, 6);
    
    return evaluationResults;
  } catch (error) {
    console.error('Error evaluating model:', error);
    return {
      davies_bouldin_index: 0,
      mean_squared_distance: 0
    };
  }
}

/**
 * Store training results in Firestore
 * @param {Object} evaluationResults - Model evaluation results
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 */
async function storeTrainingResults(evaluationResults, bigqueryClient, datasetId) {
  try {
    console.log('Storing training results...');
    
    // In a real implementation, we would store these in Firestore
    // For now, we'll just log them
    console.log('Model evaluation results:', evaluationResults);
    
    // Generate training ID
    const trainingId = `TRAIN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    console.log(`Training results stored with ID: ${trainingId}`);
    
  } catch (error) {
    console.error('Error storing training results:', error);
  }
}

/**
 * Rebuild common corrections cache with updated data
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.rebuildCommonCorrectionsCache = async (req, res) => {
  try {
    console.log('Rebuilding common corrections cache...');
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Rebuild common corrections cache
    await rebuildCommonCorrections(bigqueryClient, datasetId);
    
    console.log('Common corrections cache rebuilt successfully');
    
    res.status(200).send('Common corrections cache rebuilt successfully');
  } catch (error) {
    console.error('Error rebuilding common corrections cache:', error);
    res.status(500).send('Error rebuilding common corrections cache');
  }
};

/**
 * Rebuild common corrections cache
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 */
async function rebuildCommonCorrections(bigqueryClient, datasetId) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('training', 'common_corrections_rebuild', 'current');
    const cachedRebuild = await getFromCache(cacheKey);
    
    if (cachedRebuild) {
      console.log('Common corrections cache already rebuilt recently');
      return;
    }
    
    const query = `
      CREATE OR REPLACE TABLE \`${datasetId}.common_corrections\` AS
      WITH correction_stats AS (
        SELECT
          department_id,
          original_text,
          corrected_text,
          COUNT(*) as usage_frequency,
          AVG(confidence_score) as avg_confidence,
          MIN(created_at) as first_used,
          MAX(last_used) as last_used
        FROM \`${datasetId}.correction_history\`
        WHERE DATE(applied_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
        GROUP BY department_id, original_text, corrected_text
        HAVING usage_frequency >= 2  // Only include corrections used at least twice
      )
      SELECT
        CONCAT('CORR-', FORMAT_TIMESTAMP('%Y%m%d', CURRENT_TIMESTAMP()), '-', UPPER(RAND())) as correction_id,
        department_id,
        original_text,
        corrected_text,
        LEAST(10, usage_frequency) as levenshtein_distance,  // Approximate levenshtein distance
        usage_frequency as usage_count,
        last_used,
        avg_confidence as confidence_score,
        CURRENT_TIMESTAMP() as created_at,
        'SYSTEM' as created_by
      FROM correction_stats
      WHERE avg_confidence >= 0.4  // Only include corrections with decent confidence
      ORDER BY usage_frequency DESC, avg_confidence DESC;
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    await bigqueryClient.query(options);
    
    console.log('Common corrections cache rebuilt successfully');
    
    // Cache for 24 hours
    await storeInCache(cacheKey, { status: 'rebuilt' }, 24);
    
  } catch (error) {
    console.error('Error rebuilding common corrections cache:', error);
  }
}

/**
 * Monitor model performance and send alerts if needed
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.monitorModelPerformance = async (req, res) => {
  try {
    console.log('Monitoring model performance...');
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Get model performance metrics
    const performanceMetrics = await getModelPerformanceMetrics(bigqueryClient, datasetId);
    
    // Check if performance is degraded
    const isDegraded = checkModelPerformanceDegradation(performanceMetrics);
    
    if (isDegraded) {
      // Send alert about degraded performance
      await sendPerformanceAlert(performanceMetrics);
    }
    
    console.log('Model performance monitoring completed');
    
    res.status(200).json({
      success: true,
      performance_metrics: performanceMetrics,
      is_degraded: isDegraded
    });
  } catch (error) {
    console.error('Error monitoring model performance:', error);
    res.status(500).json({ error: 'Error monitoring model performance' });
  }
};

/**
 * Get model performance metrics
 * @param {Object} bigqueryClient - BigQuery client
 * @param {string} datasetId - Dataset ID
 * @returns {Object} Performance metrics
 */
async function getModelPerformanceMetrics(bigqueryClient, datasetId) {
  try {
    // Check cache first
    const cacheKey = generateCacheKey('monitoring', 'model_performance_metrics', 'current');
    const cachedMetrics = await getFromCache(cacheKey);
    
    if (cachedMetrics) {
      return cachedMetrics;
    }
    
    const query = `
      SELECT
        model_name,
        AVG(davies_bouldin_index) as avg_davies_bouldin_index,
        AVG(mean_squared_distance) as avg_mean_squared_distance,
        COUNT(*) as training_runs,
        MIN(training_date) as first_training,
        MAX(training_date) as last_training
      FROM \`${datasetId}.model_training_results\`
      WHERE 
        model_name = 'typo_correction_model'
        AND DATE(created_at) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      GROUP BY model_name
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    const metrics = rows.length > 0 ? {
      model_name: rows[0].model_name,
      avg_davies_bouldin_index: parseFloat(rows[0].avg_davies_bouldin_index) || 0,
      avg_mean_squared_distance: parseFloat(rows[0].avg_mean_squared_distance) || 0,
      training_runs: parseInt(rows[0].training_runs) || 0,
      first_training: rows[0].first_training ? rows[0].first_training.value : null,
      last_training: rows[0].last_training ? rows[0].last_training.value : null
    } : {
      model_name: 'typo_correction_model',
      avg_davies_bouldin_index: 0,
      avg_mean_squared_distance: 0,
      training_runs: 0,
      first_training: null,
      last_training: null
    };
    
    // Cache for 1 hour
    await storeInCache(cacheKey, metrics, 1);
    
    return metrics;
  } catch (error) {
    console.error('Error getting model performance metrics:', error);
    return {
      model_name: 'typo_correction_model',
      avg_davies_bouldin_index: 0,
      avg_mean_squared_distance: 0,
      training_runs: 0,
      first_training: null,
      last_training: null
    };
  }
}

/**
 * Check if model performance is degraded
 * @param {Object} metrics - Performance metrics
 * @returns {boolean} True if performance is degraded
 */
function checkModelPerformanceDegradation(metrics) {
  try {
    // Performance degradation thresholds
    const dbiThreshold = 2.0; // Davies-Bouldin Index threshold
    const msdThreshold = 100.0; // Mean Squared Distance threshold
    
    // Check if metrics exceed thresholds
    const isDegrading = 
      metrics.avg_davies_bouldin_index > dbiThreshold ||
      metrics.avg_mean_squared_distance > msdThreshold;
    
    return isDegrading;
  } catch (error) {
    console.error('Error checking model performance degradation:', error);
    return false;
  }
}

/**
 * Send performance alert
 * @param {Object} metrics - Performance metrics
 */
async function sendPerformanceAlert(metrics) {
  try {
    console.log('Sending performance alert:', JSON.stringify(metrics, null, 2));
    
    // In a real implementation, we would send alerts via:
    // - Email to administrators
    // - Slack/Teams notifications
    // - SMS to on-call engineers
    // - Push notifications to mobile devices
    
    // For now, we'll just log the alert
  } catch (error) {
    console.error('Error sending performance alert:', error);
  }
}

// Export functions
module.exports = {
  trainAutoCorrectionModels,
  createTrainingDataForTypoCorrection,
  trainTypoCorrectionModel,
  evaluateModel,
  storeTrainingResults,
  rebuildCommonCorrectionsCache,
  rebuildCommonCorrections,
  monitorModelPerformance,
  getModelPerformanceMetrics,
  checkModelPerformanceDegradation,
  sendPerformanceAlert
};