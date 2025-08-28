-- Department-Specific Error Pattern Definitions

-- FINANCE Department Patterns
-- Pattern 1: Payment date before transaction date
INSERT INTO `project.dataset.logical_error_patterns` 
(pattern_id, department_id, error_type, pattern_name, description, validation_rule, severity_level)
VALUES (
  'PATTERN-' || FORMAT_TIMESTAMP('%Y%m%d', CURRENT_TIMESTAMP()) || '-FIN',
  'FINANCE',
  'DATE_LOGIC',
  'PAYMENT_DATE_BEFORE_TRANSACTION',
  'Payment date cannot be before transaction date',
  'payment_date < transaction_date',
  5
);

-- INVENTORY Department Patterns
-- Pattern 1: Delivery date before manufacturing date
INSERT INTO `project.dataset.logical_error_patterns` 
(pattern_id, department_id, error_type, pattern_name, description, validation_rule, severity_level)
VALUES (
  'PATTERN-' || FORMAT_TIMESTAMP('%Y%m%d', CURRENT_TIMESTAMP()) || '-INV',
  'INVENTORY',
  'DATE_LOGIC',
  'DELIVERY_DATE_BEFORE_MANUFACTURING',
  'Delivery date cannot be before manufacturing date',
  'delivery_date < manufacturing_date',
  5
);

-- SALES Department Patterns
-- Pattern 1: Sale date before customer creation date
INSERT INTO `project.dataset.logical_error_patterns` 
(pattern_id, department_id, error_type, pattern_name, description, validation_rule, severity_level)
VALUES (
  'PATTERN-' || FORMAT_TIMESTAMP('%Y%m%d', CURRENT_TIMESTAMP()) || '-SAL',
  'SALES',
  'DATE_LOGIC',
  'SALE_DATE_BEFORE_CUSTOMER_CREATION',
  'Sale date cannot be before customer creation date',
  'sale_date < customer_creation_date',
  4
);

-- SERVICE Department Patterns
-- Pattern 1: Service date before delivery date
INSERT INTO `project.dataset.logical_error_patterns` 
(pattern_id, department_id, error_type, pattern_name, description, validation_rule, severity_level)
VALUES (
  'PATTERN-' || FORMAT_TIMESTAMP('%Y%m%d', CURRENT_TIMESTAMP()) || '-SER',
  'SERVICE',
  'DATE_LOGIC',
  'SERVICE_DATE_BEFORE_DELIVERY',
  'Service date cannot be before delivery date',
  'service_date < delivery_date',
  4
);

-- MARKETING Department Patterns
-- Pattern 1: Campaign start date before customer interaction date
INSERT INTO `project.dataset.logical_error_patterns` 
(pattern_id, department_id, error_type, pattern_name, description, validation_rule, severity_level)
VALUES (
  'PATTERN-' || FORMAT_TIMESTAMP('%Y%m%d', CURRENT_TIMESTAMP()) || '-MAR',
  'MARKETING',
  'DATE_LOGIC',
  'CAMPAIGN_START_AFTER_INTERACTION',
  'Campaign start date cannot be after customer interaction date',
  'campaign_start_date > customer_interaction_date',
  3
);

-- HR Department Patterns
-- Pattern 1: Leave start date before attendance date
INSERT INTO `project.dataset.logical_error_patterns` 
(pattern_id, department_id, error_type, pattern_name, description, validation_rule, severity_level)
VALUES (
  'PATTERN-' || FORMAT_TIMESTAMP('%Y%m%d', CURRENT_TIMESTAMP()) || '-HR',
  'HR',
  'DATE_LOGIC',
  'LEAVE_START_BEFORE_ATTENDANCE',
  'Leave start date cannot be before attendance date',
  'leave_start_date < attendance_date',
  4
);

-- MANAGEMENT Department Patterns
-- Pattern 1: Budget allocation date before fiscal year start
INSERT INTO `project.dataset.logical_error_patterns` 
(pattern_id, department_id, error_type, pattern_name, description, validation_rule, severity_level)
VALUES (
  'PATTERN-' || FORMAT_TIMESTAMP('%Y%m%d', CURRENT_TIMESTAMP()) || '-MGT',
  'MANAGEMENT',
  'DATE_LOGIC',
  'BUDGET_ALLOCATION_BEFORE_FY',
  'Budget allocation date cannot be before fiscal year start',
  'budget_allocation_date < fiscal_year_start_date',
  5
);