-- Create bqml_training_error_detection table
CREATE TABLE `project.dataset.bqml_training_error_detection` (
  user_id STRING NOT NULL,
  department_id STRING NOT NULL,
  transaction_type STRING NOT NULL,  -- Values: PAYMENT, DELIVERY, SALE, SERVICE, etc.
  error_type STRING NOT NULL,  -- Values: DATE_LOGIC, AMOUNT_LOGIC, etc.
  error_pattern_id STRING NOT NULL,
  detection_layer INT64 NOT NULL,
  confidence_score FLOAT64 NOT NULL,
  hour_of_day STRING NOT NULL,  -- Format: "00"-"23"
  day_of_week STRING NOT NULL,  -- Values: MONDAY, TUESDAY, ..., SUNDAY
  user_role STRING NOT NULL,
  resolved BOOL NOT NULL,
  training_date DATE NOT NULL
)
PARTITION BY training_date
CLUSTER BY department_id, error_type, detection_layer
OPTIONS(
  description="Pre-aggregated error detection data for BQML model training",
  expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
);