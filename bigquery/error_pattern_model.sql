-- Create error pattern recognition model
-- This script should be run daily during off-peak hours (2AM-4AM Bangladesh time)

-- First, create/update the training data table
CREATE OR REPLACE TABLE `project.dataset.bqml_training_error_detection` AS
SELECT
  e.user_id,
  e.department_id,
  t.transaction_type,
  e.error_type,
  e.error_pattern_id,
  e.detection_layer,
  e.confidence_score,
  FORMAT_TIMESTAMP('%H', e.timestamp) AS hour_of_day,
  FORMAT_TIMESTAMP('%A', e.timestamp) AS day_of_week,
  u.role AS user_role,
  e.resolved,
  CURRENT_DATE() AS training_date
FROM `project.dataset.error_detection_events` e
JOIN `project.dataset.user_profiles` u
  ON e.user_id = u.user_id
LEFT JOIN `project.dataset.transaction_metadata` t
  ON e.transaction_id = t.transaction_id
WHERE 
  DATE(e.timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 180 DAY);

-- Create the error pattern recognition model
CREATE OR REPLACE MODEL `project.dataset.error_pattern_model`
OPTIONS(
  model_type = 'boosted_tree_classifier',
  input_label_cols = ['is_high_severity']
) AS
SELECT
  *,
  IF(confidence_score > 0.9, TRUE, FALSE) AS is_high_severity
FROM `project.dataset.bqml_training_error_detection`;