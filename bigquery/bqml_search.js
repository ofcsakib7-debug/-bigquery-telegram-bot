// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 1
// Component: bqml_search_model
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 12:30 UTC
// Next Step: Implement search intent model
// =============================================

const { BigQuery } = require('@google-cloud/bigquery');

// Lazy initialization of BigQuery client
let bigquery = null;

function getBigQuery() {
  if (!bigquery) {
    bigquery = new BigQuery();
  }
  return bigquery;
}

/**
 * Create BQML training data for search optimization
 * This function should be triggered by Cloud Scheduler during off-peak hours
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.rebuildBqmlSearchTrainingData = async (req, res) => {
  try {
    console.log('Rebuilding BQML search training data...');
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    const query = `
      CREATE OR REPLACE TABLE \`${datasetId}.bqml_training_search\`
      AS
      WITH interaction_stats AS (
        SELECT
          user_id,
          department_id,
          input_text,
          interpreted_query,
          query_type,
          confidence_score,
          successful_completion,
          timestamp,
          -- Extract temporal features
          FORMAT_TIMESTAMP('%H', timestamp) AS hour_of_day,
          FORMAT_TIMESTAMP('%A', timestamp) AS day_of_week,
          -- Previous interactions (last 3)
          ARRAY_AGG(
            STRUCT(
              input_text AS prev_input,
              interpreted_query AS prev_query,
              query_type AS prev_type,
              timestamp AS prev_timestamp
            )
            OVER (
              PARTITION BY user_id 
              ORDER BY timestamp 
              ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING
            )
          ) AS previous_interactions
        FROM
          \`${datasetId}.search_interactions\`
        WHERE
          DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
        QUALIFY ROW_NUMBER() OVER (PARTITION BY user_id, input_text ORDER BY timestamp DESC) = 1
      )
      SELECT
        i.user_id,
        i.department_id,
        i.input_text,
        i.interpreted_query,
        i.query_type,
        i.confidence_score,
        i.hour_of_day,
        i.day_of_week,
        -- Extract previous queries only
        ARRAY(
          SELECT prev.prev_input 
          FROM UNNEST(i.previous_interactions) AS prev 
          WHERE prev.prev_input IS NOT NULL
          ORDER BY prev.prev_timestamp DESC
          LIMIT 3
        ) AS previous_queries,
        i.successful_completion,
        CURRENT_DATE() AS training_date
      FROM
        interaction_stats i
      WHERE
        -- Only include interactions with sufficient confidence or successful completion
        i.confidence_score > 0.5 OR i.successful_completion = TRUE
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    await bigqueryClient.query(options);
    
    console.log('BQML search training data rebuilt successfully');
    
    res.status(200).send('BQML search training data rebuilt successfully');
  } catch (error) {
    console.error('Error rebuilding BQML search training data:', error);
    res.status(500).send('Error rebuilding BQML search training data');
  }
};

/**
 * Train search intent prediction model using BQML
 * This function should be triggered by Cloud Scheduler during off-peak hours
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.trainSearchIntentModel = async (req, res) => {
  try {
    console.log('Starting search intent prediction model training...');
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Create or replace the BQML model
    const query = `
      CREATE OR REPLACE MODEL \`${datasetId}.search_intent_model\`
      OPTIONS(
        model_type='LOGISTIC_REG',
        input_label_cols=['successful_completion'],
        DATA_SPLIT_METHOD='AUTO_SPLIT'
      ) AS
      SELECT
        department_id,
        query_type,
        confidence_score,
        hour_of_day,
        day_of_week,
        ARRAY_LENGTH(previous_queries) AS previous_query_count,
        successful_completion
      FROM \`${datasetId}.bqml_training_search\`
      WHERE training_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
      AND ARRAY_LENGTH(previous_queries) <= 3
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    await bigqueryClient.query(options);
    
    console.log('Search intent prediction model training completed');
    
    // Evaluate the model
    await evaluateSearchIntentModel();
    
    res.status(200).send('Search intent prediction model training completed');
  } catch (error) {
    console.error('Error training search intent prediction model:', error);
    res.status(500).send('Error training search intent prediction model');
  }
};

/**
 * Evaluate search intent prediction model
 */
async function evaluateSearchIntentModel() {
  try {
    console.log('Evaluating search intent prediction model...');
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    const query = `
      SELECT
        *
      FROM
        ML.EVALUATE(MODEL \`${datasetId}.search_intent_model\`)
    `;
    
    const options = {
      query: query,
      location: 'us-central1'
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    console.log('Model evaluation results:', rows);
    
  } catch (error) {
    console.error('Error evaluating search intent prediction model:', error);
  }
}

/**
 * Get search intent prediction for a user input
 * @param {string} userId - User ID
 * @param {string} departmentId - Department ID
 * @param {string} inputText - Input text
 * @param {string} interpretedQuery - Interpreted query
 * @param {string} queryType - Query type
 * @param {number} confidenceScore - Confidence score
 * @returns {Object|null} Prediction results or null if not found
 */
async function getSearchIntentPrediction(userId, departmentId, inputText, interpretedQuery, queryType, confidenceScore) {
  try {
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // Get temporal features
    const now = new Date();
    const hourOfDay = now.getHours().toString().padStart(2, '0');
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    
    // Get previous queries for this user (simplified for this example)
    const previousQueries = await getUserPreviousQueries(userId, 3);
    
    const query = `
      SELECT
        predicted_successful_completion,
        predicted_successful_completion_probs[OFFSET(1)].prob AS success_probability
      FROM
        ML.PREDICT(
          MODEL \`${datasetId}.search_intent_model\`,
          STRUCT(
            @departmentId AS department_id,
            @queryType AS query_type,
            @confidenceScore AS confidence_score,
            @hourOfDay AS hour_of_day,
            @dayOfWeek AS day_of_week,
            @previousQueries AS previous_queries
          )
        )
      LIMIT 1
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: {
        departmentId,
        queryType,
        confidenceScore,
        hourOfDay,
        dayOfWeek,
        previousQueries
      }
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    if (rows.length > 0) {
      return {
        predictedSuccessfulCompletion: rows[0].predicted_successful_completion,
        successProbability: rows[0].success_probability
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting search intent prediction:', error);
    return null;
  }
}

/**
 * Get previous queries for a user
 * @param {string} userId - User ID
 * @param {number} limit - Number of previous queries to retrieve
 * @returns {Array} Array of previous queries
 */
async function getUserPreviousQueries(userId, limit) {
  try {
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    const query = `
      SELECT input_text
      FROM \`${datasetId}.search_interactions\`
      WHERE user_id = @userId
      ORDER BY timestamp DESC
      LIMIT @limit
    `;
    
    const options = {
      query: query,
      location: 'us-central1',
      params: {
        userId,
        limit
      }
    };
    
    const [rows] = await bigqueryClient.query(options);
    
    return rows.map(row => row.input_text);
  } catch (error) {
    console.error('Error getting user previous queries:', error);
    return [];
  }
}

/**
 * Rebuild department-specific search cache with BQML predictions
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 */
exports.rebuildDepartmentSearchCache = async (req, res) => {
  try {
    console.log('Rebuilding department search cache with BQML predictions...');
    
    const bigqueryClient = getBigQuery();
    const datasetId = process.env.BIGQUERY_DATASET_ID || 'business_operations';
    
    // This is a simplified example - in practice, you would rebuild cache for specific departments
    const departments = ['ACCOUNTING', 'MARKETING', 'INVENTORY', 'SERVICE', 'SALES', 'HR', 'MANAGEMENT'];
    
    for (const department of departments) {
      try {
        // Example: Update cache for most common search patterns in this department
        const query = `
          CREATE OR REPLACE TABLE \`${datasetId}.${department.toLowerCase()}_search_cache\`
          AS
          SELECT
            CONCAT(LOWER(@department), ':', pattern, ':', user_id) AS cache_key,
            expanded_query AS result_data,
            TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR) AS expires_at,
            0 AS hit_count,
            CURRENT_TIMESTAMP() AS last_accessed,
            CURRENT_TIMESTAMP() AS created_at,
            CURRENT_TIMESTAMP() AS updated_at
          FROM (
            SELECT
              pattern,
              expanded_query,
              'common_user' AS user_id,
              usage_count,
              priority_score
            FROM \`${datasetId}.search_intention_patterns\`
            WHERE department_id = @department
            AND priority_score > 0.5
            ORDER BY usage_count DESC, priority_score DESC
            LIMIT 50
          )
        `;
        
        const options = {
          query: query,
          location: 'us-central1',
          params: {
            department
          }
        };
        
        await bigqueryClient.query(options);
        
        console.log(`Search cache rebuilt for department: ${department}`);
      } catch (error) {
        console.error(`Error rebuilding search cache for department ${department}:`, error);
      }
    }
    
    console.log('Department search caches rebuilt successfully');
    
    res.status(200).send('Department search caches rebuilt successfully');
  } catch (error) {
    console.error('Error rebuilding department search caches:', error);
    res.status(500).send('Error rebuilding department search caches');
  }
};

// Export functions
module.exports = {
  getSearchIntentPrediction,
  getUserPreviousQueries
};