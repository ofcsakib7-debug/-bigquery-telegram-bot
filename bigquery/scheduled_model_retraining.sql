-- 2. Daily model retraining at 03:00 Asia/Dhaka
-- Scheduled Query Name: daily_model_retraining
CREATE OR REPLACE MODEL `project.dataset.error_pattern_model`
OPTIONS(
  model_type = 'boosted_tree_classifier',
  input_label_cols = ['is_high_severity']
) AS
SELECT
  *,
  IF(confidence_score > 0.9, TRUE, FALSE) AS is_high_severity
FROM `project.dataset.bqml_training_error_detection`;

-- Labels for quota monitoring:
-- name: daily_model_retraining
-- schedule: 0 3 * * *
-- timezone: Asia/Dhaka
-- maximum_bytes_billed: 100000000