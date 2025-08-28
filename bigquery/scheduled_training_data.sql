-- Scheduled Queries for Logical Error Detection System

-- 1. Daily training data update at 02:00 Asia/Dhaka
-- Scheduled Query Name: daily_training_data_update
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

-- Labels for quota monitoring:
-- name: daily_training_data_update
-- schedule: 0 2 * * *
-- timezone: Asia/Dhaka
-- maximum_bytes_billed: 100000000