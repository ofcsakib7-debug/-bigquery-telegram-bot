-- Create error_detection_events table
CREATE TABLE `project.dataset.error_detection_events` (
  event_id STRING NOT NULL,  -- Format: ERR-{YYYYMMDD}-{3-random}
  user_id STRING NOT NULL,  -- Telegram user ID
  department_id STRING NOT NULL,  -- Values: FINANCE, INVENTORY, etc.
  transaction_id STRING NOT NULL,  -- Reference to the transaction being validated
  error_type STRING NOT NULL,  -- Values: DATE_LOGIC, AMOUNT_LOGIC, etc.
  error_pattern_id STRING NOT NULL,  -- Reference to logical_error_patterns.pattern_id
  error_message STRING NOT NULL,  -- User-friendly error message
  suggested_corrections ARRAY<STRING> NOT NULL,  -- Actionable suggestions for fixing
  detection_layer INT64 NOT NULL,  -- 1-4 (which layer detected the error)
  confidence_score FLOAT64 NOT NULL,  -- 0.0-1.0 scale (1.0 = highest confidence)
  resolved BOOL DEFAULT FALSE,  -- TRUE if user resolved the error
  resolution_timestamp TIMESTAMP,
  timestamp TIMESTAMP NOT NULL
)
PARTITION BY DATE(timestamp)
CLUSTER BY department_id, error_type, detection_layer
OPTIONS(
  description="Tracking of all logical error detections for analysis and model training",
  expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 12 MONTH)
);