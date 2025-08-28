-- Department-Specific BQML Models

-- FINANCE Department Model
CREATE OR REPLACE MODEL `project.dataset.finance_error_model`
OPTIONS(
  model_type = 'logistic_reg',
  input_label_cols = ['is_high_severity']
) AS
SELECT
  transaction_date,
  payment_date,
  amount,
  branch_cash_balance,
  CASE 
    WHEN payment_date < transaction_date THEN 1 
    ELSE 0 
  END AS is_high_severity
FROM `project.dataset.payment_receipts`
WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY);

-- INVENTORY Department Model
CREATE OR REPLACE MODEL `project.dataset.inventory_error_model`
OPTIONS(
  model_type = 'logistic_reg',
  input_label_cols = ['is_high_severity']
) AS
SELECT
  manufacturing_date,
  delivery_date,
  service_date,
  quantity,
  stock_count,
  CASE 
    WHEN delivery_date < manufacturing_date THEN 1 
    ELSE 0 
  END AS is_high_severity
FROM `project.dataset.machine_inventory_transactions`
WHERE DATE(transaction_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY);

-- SALES Department Model
CREATE OR REPLACE MODEL `project.dataset.sales_error_model`
OPTIONS(
  model_type = 'logistic_reg',
  input_label_cols = ['is_high_severity']
) AS
SELECT
  sale_date,
  customer_creation_date,
  sale_amount,
  product_price,
  CASE 
    WHEN sale_date < customer_creation_date THEN 1 
    ELSE 0 
  END AS is_high_severity
FROM `project.dataset.sales_transactions`
WHERE DATE(transaction_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY);

-- SERVICE Department Model
CREATE OR REPLACE MODEL `project.dataset.service_error_model`
OPTIONS(
  model_type = 'logistic_reg',
  input_label_cols = ['is_high_severity']
) AS
SELECT
  service_date,
  delivery_date,
  technician_id,
  service_duration,
  CASE 
    WHEN service_date < delivery_date THEN 1 
    ELSE 0 
  END AS is_high_severity
FROM `project.dataset.service_transactions`
WHERE DATE(transaction_date) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY);