-- Initialization script for Logical Error Detection System
-- This script creates all required tables and models for Design 7, Phase 1

-- 1. Create logical_error_patterns table
CREATE TABLE `project.dataset.logical_error_patterns` (
  pattern_id STRING NOT NULL,  -- Format: PATTERN-{YYYYMMDD}-{3-random}
  department_id STRING NOT NULL,  -- Values: FINANCE, INVENTORY, SALES, SERVICE, MARKETING, HR, MANAGEMENT
  error_type STRING NOT NULL,  -- Values: DATE_LOGIC, AMOUNT_LOGIC, STOCK_LOGIC, REFERENCE_LOGIC
  pattern_name STRING NOT NULL,  -- Human-readable pattern name
  description STRING NOT NULL,  -- Detailed description of the error pattern
  validation_rule STRING NOT NULL,  -- The SQL rule to validate this pattern
  severity_level INT64 NOT NULL,  -- 1-5 scale (5 = most severe)
  usage_count INT64 DEFAULT 0,
  last_triggered TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
CLUSTER BY department_id, error_type, severity_level
OPTIONS(
  description="Department-specific logical error patterns with validation rules for proactive error prevention",
  expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 36 MONTH)
);

-- 2. Create error_detection_events table
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

-- 3. Create bqml_training_error_detection table
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

-- 4. Create logical_errors_daily table
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

-- 5. Create department-specific error cache tables
-- Finance
CREATE TABLE `project.dataset.finance_error_cache` (
  cache_key STRING NOT NULL,
  error_patterns ARRAY<STRUCT<
    pattern_id STRING,
    error_type STRING,
    error_message STRING,
    suggested_corrections ARRAY<STRING>,
    confidence_score FLOAT64
  >> NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  hit_count INT64 DEFAULT 0,
  last_accessed TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(expires_at)
CLUSTER BY user_id, transaction_type
OPTIONS(
  description="Department-specific error pattern cache with user context"
);

-- Inventory
CREATE TABLE `project.dataset.inventory_error_cache` (
  cache_key STRING NOT NULL,
  error_patterns ARRAY<STRUCT<
    pattern_id STRING,
    error_type STRING,
    error_message STRING,
    suggested_corrections ARRAY<STRING>,
    confidence_score FLOAT64
  >> NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  hit_count INT64 DEFAULT 0,
  last_accessed TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(expires_at)
CLUSTER BY user_id, transaction_type
OPTIONS(
  description="Department-specific error pattern cache with user context"
);

-- Sales
CREATE TABLE `project.dataset.sales_error_cache` (
  cache_key STRING NOT NULL,
  error_patterns ARRAY<STRUCT<
    pattern_id STRING,
    error_type STRING,
    error_message STRING,
    suggested_corrections ARRAY<STRING>,
    confidence_score FLOAT64
  >> NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  hit_count INT64 DEFAULT 0,
  last_accessed TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(expires_at)
CLUSTER BY user_id, transaction_type
OPTIONS(
  description="Department-specific error pattern cache with user context"
);

-- Service
CREATE TABLE `project.dataset.service_error_cache` (
  cache_key STRING NOT NULL,
  error_patterns ARRAY<STRUCT<
    pattern_id STRING,
    error_type STRING,
    error_message STRING,
    suggested_corrections ARRAY<STRING>,
    confidence_score FLOAT64
  >> NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  hit_count INT64 DEFAULT 0,
  last_accessed TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(expires_at)
CLUSTER BY user_id, transaction_type
OPTIONS(
  description="Department-specific error pattern cache with user context"
);

-- Marketing
CREATE TABLE `project.dataset.marketing_error_cache` (
  cache_key STRING NOT NULL,
  error_patterns ARRAY<STRUCT<
    pattern_id STRING,
    error_type STRING,
    error_message STRING,
    suggested_corrections ARRAY<STRING>,
    confidence_score FLOAT64
  >> NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  hit_count INT64 DEFAULT 0,
  last_accessed TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(expires_at)
CLUSTER BY user_id, transaction_type
OPTIONS(
  description="Department-specific error pattern cache with user context"
);

-- HR
CREATE TABLE `project.dataset.hr_error_cache` (
  cache_key STRING NOT NULL,
  error_patterns ARRAY<STRUCT<
    pattern_id STRING,
    error_type STRING,
    error_message STRING,
    suggested_corrections ARRAY<STRING>,
    confidence_score FLOAT64
  >> NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  hit_count INT64 DEFAULT 0,
  last_accessed TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(expires_at)
CLUSTER BY user_id, transaction_type
OPTIONS(
  description="Department-specific error pattern cache with user context"
);

-- Management
CREATE TABLE `project.dataset.management_error_cache` (
  cache_key STRING NOT NULL,
  error_patterns ARRAY<STRUCT<
    pattern_id STRING,
    error_type STRING,
    error_message STRING,
    suggested_corrections ARRAY<STRING>,
    confidence_score FLOAT64
  >> NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  hit_count INT64 DEFAULT 0,
  last_accessed TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(expires_at)
CLUSTER BY user_id, transaction_type
OPTIONS(
  description="Department-specific error pattern cache with user context"
);

-- 6. Insert department-specific error patterns
-- (This would typically be done separately to allow for custom pattern IDs)

-- 7. Create BQML models
-- (These would typically be created by the scheduled queries)

-- Initialization complete