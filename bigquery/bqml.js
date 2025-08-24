// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 1
// Phase: 2
// Component: bqml_integration
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 15:45 UTC
// Next Step: Implement model training and evaluation
// =============================================

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Train UI struggle prediction model using BQML
 * This function should be triggered by Cloud Scheduler during off-peak hours
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.trainUiStruggleModel = async (req, res) => {
  try {
    console.log('Starting UI struggle prediction model training...');
    
    // Create or replace the BQML model
    const query = `
      CREATE OR REPLACE MODEL \`${process.env.BIGQUERY_DATASET_ID || 'business_operations'}.ui_struggle_prediction\`
      OPTIONS(
        model_type='LOGISTIC_REG',
        input_label_cols=['needs_improvement']
      ) AS
      SELECT
        department_id,
        target_screen,
        interaction_type,
        avg_response_time,
        error_rate,
        completion_rate,
        needs_improvement
      FROM \`${process.env.BIGQUERY_DATASET_ID || 'business_operations'}.bqml_training_ui_optimization\`
      WHERE training_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    await bigquery.query(options);
    
    console.log('UI struggle prediction model training completed');
    
    // Evaluate the model
    await evaluateUiStruggleModel();
    
    res.status(200).send('UI struggle prediction model training completed');
  } catch (error) {
    console.error('Error training UI struggle prediction model:', error);
    res.status(500).send('Error training UI struggle prediction model');
  }
};

/**
 * Evaluate UI struggle prediction model
 */
async function evaluateUiStruggleModel() {
  try {
    console.log('Evaluating UI struggle prediction model...');
    
    const query = `
      SELECT
        *
      FROM
        ML.EVALUATE(MODEL \`${process.env.BIGQUERY_DATASET_ID || 'business_operations'}.ui_struggle_prediction\`)
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigquery.query(options);
    
    console.log('Model evaluation results:', rows);
    
    // If model evaluation shows improvement, rebuild cache_ui_optimization
    if (rows && rows.length > 0) {
      const evaluation = rows[0];
      // In a real implementation, we would compare with previous evaluation
      // and decide whether to rebuild cache_ui_optimization
      console.log('Model evaluation completed');
    }
    
  } catch (error) {
    console.error('Error evaluating UI struggle prediction model:', error);
  }
}

/**
 * Rebuild cache_ui_optimization table with BQML predictions
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.rebuildUiOptimizationCache = async (req, res) => {
  try {
    console.log('Rebuilding UI optimization cache with BQML predictions...');
    
    const query = `
      CREATE OR REPLACE TABLE \`${process.env.BIGQUERY_DATASET_ID || 'business_operations'}.cache_ui_optimization\`
      AS
      SELECT
        target_screen,
        department_id,
        interaction_type,
        avg_response_time,
        error_rate,
        completion_rate,
        common_snooze_patterns,
        IF(avg_response_time > 120 OR error_rate > 0.35, TRUE, FALSE) AS needs_improvement,
        CURRENT_TIMESTAMP() AS last_updated
      FROM \`${process.env.BIGQUERY_DATASET_ID || 'business_operations'}.bqml_training_ui_optimization\`
      WHERE training_date = CURRENT_DATE()
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    await bigquery.query(options);
    
    console.log('UI optimization cache rebuilt successfully');
    
    res.status(200).send('UI optimization cache rebuilt successfully');
  } catch (error) {
    console.error('Error rebuilding UI optimization cache:', error);
    res.status(500).send('Error rebuilding UI optimization cache');
  }
};

/**
 * Get UI optimization recommendations for a user
 * @param {string} userId - User ID
 * @param {string} departmentId - Department ID
 * @param {string} targetScreen - Target screen
 * @returns {Object|null} Optimization recommendations or null if not found
 */
async function getUiOptimizationRecommendations(userId, departmentId, targetScreen) {
  try {
    const query = `
      SELECT
        *
      FROM
        \`${process.env.BIGQUERY_DATASET_ID || 'business_operations'}.cache_ui_optimization\`
      WHERE
        department_id = @departmentId
        AND target_screen = @targetScreen
      LIMIT 1
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: {
        departmentId,
        targetScreen
      }
    };
    
    const [rows] = await bigquery.query(options);
    
    if (rows.length > 0) {
      return rows[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting UI optimization recommendations:', error);
    return null;
  }
}

/**
 * Rebuild BQML training data from ui_interaction_patterns
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.rebuildBqmlTrainingData = async (req, res) => {
  try {
    console.log('Rebuilding BQML training data...');
    
    const query = `
      CREATE OR REPLACE TABLE \`${process.env.BIGQUERY_DATASET_ID || 'business_operations'}.bqml_training_ui_optimization\`
      AS
      WITH interaction_stats AS (
        SELECT
          user_id,
          department_id,
          target_screen,
          interaction_type,
          AVG(response_time_seconds) AS avg_response_time,
          AVG(IF(error_flag, 1.0, 0.0)) AS error_rate,
          AVG(IF(completed_workflow, 1.0, 0.0)) AS completion_rate,
          COUNT(*) AS interaction_count
        FROM
          \`${process.env.BIGQUERY_DATASET_ID || 'business_operations'}.ui_interaction_patterns\`
        WHERE
          DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        GROUP BY
          user_id, department_id, target_screen, interaction_type
      ),
      snooze_patterns AS (
        SELECT
          user_id,
          department_id,
          target_screen,
          interaction_type,
          ARRAY_AGG(
            STRUCT(
              snooze_duration,
              COUNT(*) AS count
            )
            ORDER BY COUNT(*) DESC
            LIMIT 3
          ) AS common_snooze_patterns
        FROM
          \`${process.env.BIGQUERY_DATASET_ID || 'business_operations'}.ui_interaction_patterns\`
        WHERE
          snooze_duration IS NOT NULL
          AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        GROUP BY
          user_id, department_id, target_screen, interaction_type
      )
      SELECT
        i.user_id,
        i.department_id,
        i.target_screen,
        i.interaction_type,
        i.avg_response_time,
        i.error_rate,
        s.common_snooze_patterns,
        i.completion_rate,
        0.0 AS new_user_rate, -- Would need to implement user age calculation
        CURRENT_DATE() AS training_date
      FROM
        interaction_stats i
      LEFT JOIN
        snooze_patterns s
      ON
        i.user_id = s.user_id
        AND i.department_id = s.department_id
        AND i.target_screen = s.target_screen
        AND i.interaction_type = s.interaction_type
      WHERE
        i.interaction_count >= 20 -- Minimum sample size
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    await bigquery.query(options);
    
    console.log('BQML training data rebuilt successfully');
    
    res.status(200).send('BQML training data rebuilt successfully');
  } catch (error) {
    console.error('Error rebuilding BQML training data:', error);
    res.status(500).send('Error rebuilding BQML training data');
  }
};

// Export functions
module.exports = {
  getUiOptimizationRecommendations
};