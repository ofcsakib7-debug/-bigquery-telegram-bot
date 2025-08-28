-- 3. Daily logical errors reconciliation at 04:00 Asia/Dhaka
-- Scheduled Query Name: daily_logical_errors_reconciliation
CREATE OR REPLACE TABLE `project.dataset.logical_errors_daily` AS
SELECT
  CONCAT('ERR-DAILY-', FORMAT_TIMESTAMP('%Y%m%d', CURRENT_TIMESTAMP()), '-', 
         SUBSTR(FORMAT_TIMESTAMP('%s', CURRENT_TIMESTAMP()), -3)) AS error_id,
  error_type,
  description,
  transaction_id,
  transaction_date,
  related_date,
  amount,
  user_id,
  confidence_score,
  CURRENT_DATE() AS detection_date
FROM (
  SELECT
    e.error_type,
    p.description,
    e.transaction_id,
    t.transaction_date,
    t.related_date,
    t.amount,
    e.user_id,
    e.confidence_score
  FROM `project.dataset.error_detection_events` e
  JOIN `project.dataset.logical_error_patterns` p ON e.error_pattern_id = p.pattern_id
  JOIN `project.dataset.transactions` t ON e.transaction_id = t.transaction_id
  WHERE 
    DATE(e.timestamp) = DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY)
    AND e.confidence_score > 0.85
    AND e.resolved = FALSE
)
WHERE confidence_score > 0.85;

-- Labels for quota monitoring:
-- name: daily_logical_errors_reconciliation
-- schedule: 0 4 * * *
-- timezone: Asia/Dhaka
-- maximum_bytes_billed: 100000000