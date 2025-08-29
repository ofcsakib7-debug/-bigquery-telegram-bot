/**
 * Scheduled Queries Implementation
 * 
 * This module implements the scheduled queries requirements
 * as specified in Design 8.
 */

/**
 * Generate daily scheduled query for bqml_training_contextual_actions
 * Runs at 02:00 Asia/Dhaka time
 * @returns {string} SQL query
 */
function generateBQMLTrainingDataQuery() {
  return `
-- Scheduled query for bqml_training_contextual_actions
-- Runs daily at 02:00 Asia/Dhaka time

-- First, delete old training data (older than 90 days)
DELETE FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.bqml_training_contextual_actions\`
WHERE training_date < DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY);

-- Then, insert new training data from the last 90 days
INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.bqml_training_contextual_actions\`
(user_id, department_id, context_type, primary_intent, suggested_actions, selected_action, 
 hour_of_day, day_of_week, user_role, confidence_score, training_date)
SELECT 
  user_id,
  department_id,
  context_type,
  primary_intent,
  ARRAY_AGG(suggested_action) as suggested_actions,
  selected_action,
  FORMAT_TIMESTAMP('%H', timestamp) as hour_of_day,
  FORMAT_TIMESTAMP('%A', timestamp) as day_of_week,
  user_role,
  AVG(confidence_score) as confidence_score,
  CURRENT_DATE() as training_date
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.contextual_action_interactions\`
WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
  AND DATE(timestamp) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)  -- Only process yesterday's data
  AND _PARTITIONTIME >= TIMESTAMP(DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY))  -- Partition filter
GROUP BY user_id, department_id, context_type, primary_intent, selected_action, user_role;

-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "bqml_training", "timezone": "Asia/Dhaka"}
`;
}

/**
 * Generate daily scheduled query for contextual_action_model retraining
 * Runs at 03:00 Asia/Dhaka time
 * @returns {string} SQL query
 */
function generateModelRetrainingQuery() {
  return `
-- Scheduled query for contextual_action_model retraining
-- Runs daily at 03:00 Asia/Dhaka time

-- Create or replace the BQML model using the training data
-- Only use data from the last 90 days
CREATE OR REPLACE MODEL \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.contextual_action_model\`
OPTIONS(
  model_type='BOOSTED_TREE_CLASSIFIER',
  BOOSTER_TYPE='GBTREE',
  MAX_ITERATIONS=50
) AS
SELECT
  department_id,
  context_type,
  primary_intent,
  hour_of_day,
  day_of_week,
  user_role,
  selected_action as label
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.bqml_training_contextual_actions\`
WHERE training_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY);

-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "model_retraining", "timezone": "Asia/Dhaka"}
`;
}

/**
 * Generate data quality check scheduled query
 * Runs daily to validate data integrity
 * @returns {string} SQL query
 */
function generateDataQualityCheckQuery() {
  return `
-- Scheduled query for data quality checks
-- Runs daily to validate data integrity

-- Check command_patterns table
SELECT 
  'command_patterns' as table_name,
  COUNT(*) as total_rows,
  COUNTIF(pattern_id NOT LIKE 'PATTERN-%') as invalid_pattern_id,
  COUNTIF(department_id NOT IN ('ADMIN', 'FINANCE', 'INVENTORY', 'SERVICE', 'SALES', 'HR', 'MANAGEMENT')) as invalid_department,
  COUNTIF(priority_score < 0 OR priority_score > 1) as invalid_priority
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.command_patterns\`
WHERE DATE(created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
UNION ALL

-- Check prelisted_items table
SELECT 
  'prelisted_items' as table_name,
  COUNT(*) as total_rows,
  COUNTIF(item_id NOT LIKE 'ITEM-%') as invalid_item_id,
  COUNTIF(LENGTH(item_code) < 2 OR LENGTH(item_code) > 4) as invalid_item_code,
  0 as invalid_priority
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.prelisted_items\`
WHERE DATE(created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
UNION ALL

-- Check contextual_actions table
SELECT 
  'contextual_actions' as table_name,
  COUNT(*) as total_rows,
  COUNTIF(action_id NOT LIKE 'ACTION-%') as invalid_action_id,
  COUNTIF(action_data NOT LIKE 'ctx:%') as invalid_action_data,
  0 as invalid_priority
FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.contextual_actions\`
WHERE DATE(created_at) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY);

-- Add labels for quota monitoring
-- Labels: {"schedule": "daily", "purpose": "data_quality", "timezone": "Asia/Dhaka"}
`;
}

/**
 * Generate department-specific pattern examples
 * @returns {Array} Array of example patterns
 */
function generateDepartmentPatternExamples() {
  return [
    // INVENTORY: Multi-model quantity search patterns
    {
      pattern_id: 'PATTERN-INV-INPUT-ABC',
      department_id: 'INVENTORY',
      pattern_type: 'INPUT',
      pattern: '^[a-z0-9]{2,4}=\\d{1,2}$',
      description: 'Machine model with quantity',
      parsing_logic: 'SPLIT(segment, "=") AS (model_code, quantity)',
      sample_input: 'a2b=2',
      sample_output: 'Juki A2B - 2 units',
      priority_score: 0.95
    },
    
    // ADMIN: Department management patterns
    {
      pattern_id: 'PATTERN-ADM-ADMIN-ABC',
      department_id: 'ADMIN',
      pattern_type: 'ADMIN',
      pattern: '^adddept=\\w+$',
      description: 'Add new department',
      parsing_logic: 'REGEXP_EXTRACT(segment, "adddept=(\\\\w+)") AS department_name',
      sample_input: 'adddept=HR',
      sample_output: 'Add HR Department',
      priority_score: 0.95
    }
  ];
}

/**
 * Generate department-specific contextual actions
 * @returns {Array} Array of example actions
 */
function generateDepartmentContextualActions() {
  return [
    // INVENTORY: Inventory-specific action suggestions
    {
      action_id: 'ACTION-INV-RESULT-ABC',
      department_id: 'INVENTORY',
      context_type: 'RESULT',
      primary_intent: 'MULTI_MODEL_SEARCH',
      suggested_action: 'VIEW_MODEL_DETAILS',
      action_text: 'View Model Details',
      action_data: 'ctx:view_details:{model_code}',
      confidence_score: 0.92
    },
    
    // ADMIN: Admin-specific action suggestions
    {
      action_id: 'ACTION-ADM-ERROR-ABC',
      department_id: 'ADMIN',
      context_type: 'ERROR',
      primary_intent: 'ADD_DEPT',
      suggested_action: 'USE_SIMILAR_DEPT',
      action_text: 'Use Similar Department',
      action_data: 'ctx:use_similar:{dept_name}',
      confidence_score: 0.85
    }
  ];
}

// Export functions
module.exports = {
  generateBQMLTrainingDataQuery,
  generateModelRetrainingQuery,
  generateDataQualityCheckQuery,
  generateDepartmentPatternExamples,
  generateDepartmentContextualActions
};