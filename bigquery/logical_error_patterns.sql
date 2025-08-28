-- Create logical_error_patterns table
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