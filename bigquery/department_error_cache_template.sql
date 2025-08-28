-- Create department-specific error cache table template
-- This template will be used to create tables for each department:
-- finance_error_cache, inventory_error_cache, sales_error_cache, etc.

CREATE TABLE `project.dataset.{department}_error_cache` (
  cache_key STRING NOT NULL,  -- Format: "{dept}:{transaction_id}:{user_id}"
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