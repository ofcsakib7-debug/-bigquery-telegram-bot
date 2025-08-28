-- Create logical_errors_daily table
CREATE TABLE `project.dataset.logical_errors_daily` (
  error_id STRING NOT NULL,  -- Format: ERR-DAILY-{YYYYMMDD}-{3-random}
  error_type STRING NOT NULL,  -- Values: DATE_LOGIC, AMOUNT_LOGIC, etc.
  description STRING NOT NULL,
  transaction_id STRING NOT NULL,
  transaction_date TIMESTAMP NOT NULL,
  related_date TIMESTAMP,  -- Secondary date for comparison (e.g., payment_date)
  amount FLOAT64,
  user_id STRING NOT NULL,
  confidence_score FLOAT64 NOT NULL,  -- 0.0-1.0 scale
  detection_date DATE NOT NULL
)
PARTITION BY detection_date
CLUSTER BY error_type, confidence_score
OPTIONS(
  description="Daily reconciliation of potential logical errors detected in background",
  expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
);