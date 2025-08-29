/**
 * BigQuery Table Schemas for Design 11
 * 
 * This file contains the schema definitions for all BigQuery tables
 * as specified in Design 11 of the architecture specification.
 */

// Dealer Profiles Table
const DEALER_PROFILES_SCHEMA = {
  tableId: 'dealer_profiles',
  schema: {
    fields: [
      {
        name: 'dealer_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: DEALER-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'dealer_name',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'dealer_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: DEALER, SUB_DEALER'
      },
      {
        name: 'parent_dealer_id',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'NULL for top-level dealers'
      },
      {
        name: 'contact_person',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'contact_phone',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'contact_email',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'address',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'territory',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Geographic territory'
      },
      {
        name: 'opening_date',
        type: 'DATE',
        mode: 'REQUIRED'
      },
      {
        name: 'status',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: ACTIVE, INACTIVE, PROBATION'
      },
      {
        name: 'dealer_tier',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: PLATINUM, GOLD, SILVER, BRONZE'
      },
      {
        name: 'created_at',
        type: 'TIMESTAMP',
        mode: 'REQUIRED',
        defaultValue: 'CURRENT_TIMESTAMP()'
      },
      {
        name: 'updated_at',
        type: 'TIMESTAMP',
        mode: 'REQUIRED',
        defaultValue: 'CURRENT_TIMESTAMP()'
      }
    ]
  },
  partitioning: {
    field: 'opening_date',
    type: 'DAY'
  },
  clustering: ['dealer_type', 'status', 'dealer_tier'],
  description: 'Dealer and sub-dealer profile management with hierarchical relationships',
  expiration: {
    period: 36,
    unit: 'MONTHS'
  }
};

// Dealer Credit Terms Table
const DEALER_CREDIT_TERMS_SCHEMA = {
  tableId: 'dealer_credit_terms',
  schema: {
    fields: [
      {
        name: 'credit_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: CREDIT-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'dealer_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'credit_limit_bdt',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'credit_days',
        type: 'INT64',
        mode: 'REQUIRED'
      },
      {
        name: 'interest_rate_per_day',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'discount_structure',
        type: 'JSON',
        mode: 'REQUIRED',
        description: 'Volume-based discount tiers'
      },
      {
        name: 'minimum_order_value_bdt',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'last_credit_review',
        type: 'DATE',
        mode: 'REQUIRED'
      },
      {
        name: 'credit_score',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'credit_risk_category',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: LOW, MEDIUM, HIGH'
      },
      {
        name: 'created_at',
        type: 'TIMESTAMP',
        mode: 'REQUIRED',
        defaultValue: 'CURRENT_TIMESTAMP()'
      },
      {
        name: 'updated_at',
        type: 'TIMESTAMP',
        mode: 'REQUIRED',
        defaultValue: 'CURRENT_TIMESTAMP()'
      }
    ]
  },
  partitioning: {
    field: 'last_credit_review',
    type: 'DAY'
  },
  clustering: ['dealer_id', 'credit_risk_category'],
  description: 'Dealer credit terms with BQML-powered risk scoring',
  expiration: {
    period: 24,
    unit: 'MONTHS'
  }
};

// Dealer Stock Transfers Journal Table
const DEALER_STOCK_TRANSFERS_JOURNAL_SCHEMA = {
  tableId: 'dealer_stock_transfers_journal',
  schema: {
    fields: [
      {
        name: 'transfer_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: TRANSFER-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'transfer_date',
        type: 'TIMESTAMP',
        mode: 'REQUIRED'
      },
      {
        name: 'from_branch_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'to_dealer_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'transfer_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: NEW_STOCK, RETURN, EXCHANGE'
      },
      {
        name: 'transfer_status',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: PENDING, SHIPPED, DELIVERED, RECEIVED'
      },
      {
        name: 'challan_number',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'challan_date',
        type: 'DATE',
        mode: 'REQUIRED'
      },
      {
        name: 'vehicle_id',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'For logistics tracking'
      },
      {
        name: 'driver_id',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'expected_delivery_date',
        type: 'DATE',
        mode: 'NULLABLE'
      },
      {
        name: 'actual_delivery_date',
        type: 'DATE',
        mode: 'NULLABLE'
      },
      {
        name: 'created_by',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'created_at',
        type: 'TIMESTAMP',
        mode: 'REQUIRED',
        defaultValue: 'CURRENT_TIMESTAMP()'
      }
    ]
  },
  partitioning: {
    field: 'transfer_date',
    type: 'DAY'
  },
  clustering: ['to_dealer_id', 'transfer_status', 'transfer_type'],
  description: 'Append-only journal for all dealer stock transfers',
  expiration: {
    period: 36,
    unit: 'MONTHS'
  }
};

// Dealer Stock Transfers Cache Table
const DEALER_STOCK_TRANSFERS_CACHE_SCHEMA = {
  tableId: 'dealer_stock_transfers_cache',
  schema: {
    fields: [
      {
        name: 'transfer_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'challan_number',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'dealer_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'dealer_name',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'branch_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'branch_name',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'total_items',
        type: 'INT64',
        mode: 'REQUIRED'
      },
      {
        name: 'total_value_bdt',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'status',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'last_updated',
        type: 'TIMESTAMP',
        mode: 'REQUIRED'
      }
    ]
  },
  partitioning: {
    field: 'last_updated',
    type: 'DAY'
  },
  clustering: ['dealer_id', 'status'],
  description: 'Materialized view of current dealer stock transfers for fast user-facing queries',
  expiration: {
    period: 7,
    unit: 'DAYS'
  }
};

// Dealer Challan Items Table
const DEALER_CHALLAN_ITEMS_SCHEMA = {
  tableId: 'dealer_challan_items',
  schema: {
    fields: [
      {
        name: 'challan_item_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: CHALLANITEM-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'transfer_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'challan_number',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'machine_model_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'machine_model_name',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'serial_number',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'For tracking individual units'
      },
      {
        name: 'quantity',
        type: 'INT64',
        mode: 'REQUIRED'
      },
      {
        name: 'dealer_price_bdt',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'discount_percent',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'final_price_bdt',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'warranty_months',
        type: 'INT64',
        mode: 'REQUIRED'
      },
      {
        name: 'created_at',
        type: 'TIMESTAMP',
        mode: 'REQUIRED',
        defaultValue: 'CURRENT_TIMESTAMP()'
      }
    ]
  },
  partitioning: {
    field: 'created_at',
    type: 'DAY'
  },
  clustering: ['challan_number', 'machine_model_id'],
  description: 'Detailed item-level information for dealer challans',
  expiration: {
    period: 36,
    unit: 'MONTHS'
  }
};

// Dealer Payment Journal Table
const DEALER_PAYMENT_JOURNAL_SCHEMA = {
  tableId: 'dealer_payment_journal',
  schema: {
    fields: [
      {
        name: 'payment_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: PAY-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'dealer_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'dealer_name',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'challan_number',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'NULL for advance payments'
      },
      {
        name: 'payment_timestamp',
        type: 'TIMESTAMP',
        mode: 'REQUIRED'
      },
      {
        name: 'payment_method',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: CASH, BANK_TRANSFER, MOBILE_BANKING'
      },
      {
        name: 'bank_account_number',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'payment_amount_bdt',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'receiving_branch_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'payment_for_month',
        type: 'DATE',
        mode: 'REQUIRED',
        description: 'Month this payment is for'
      },
      {
        name: 'payment_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: ADVANCE, AGAINST_CHALLAN, SETTLEMENT'
      },
      {
        name: 'approved_by',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Telegram User ID'
      },
      {
        name: 'initiated_by',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Telegram User ID'
      },
      {
        name: 'notes',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'created_at',
        type: 'TIMESTAMP',
        mode: 'REQUIRED',
        defaultValue: 'CURRENT_TIMESTAMP()'
      }
    ]
  },
  partitioning: {
    field: 'payment_timestamp',
    type: 'DAY'
  },
  clustering: ['dealer_id', 'payment_type', 'payment_method'],
  description: 'Append-only journal for all dealer payments',
  expiration: {
    period: 36,
    unit: 'MONTHS'
  }
};

// Dealer Financial Ledger Table
const DEALER_FINANCIAL_LEDGER_SCHEMA = {
  tableId: 'dealer_financial_ledger',
  schema: {
    fields: [
      {
        name: 'ledger_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: LEDGER-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'transaction_date',
        type: 'DATE',
        mode: 'REQUIRED'
      },
      {
        name: 'dealer_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'dealer_name',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'transaction_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: SALE, PAYMENT, ADJUSTMENT, INTEREST'
      },
      {
        name: 'debit_account',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'credit_account',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'amount_bdt',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'reference_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Links to challan or payment'
      },
      {
        name: 'branch_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'voucher_number',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'voucher_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: CHALLAN, PAYMENT, JOURNAL'
      },
      {
        name: 'status',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: DRAFT, POSTED, CANCELLED'
      },
      {
        name: 'created_by',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'created_at',
        type: 'TIMESTAMP',
        mode: 'REQUIRED',
        defaultValue: 'CURRENT_TIMESTAMP()'
      }
    ]
  },
  partitioning: {
    field: 'transaction_date',
    type: 'DAY'
  },
  clustering: ['dealer_id', 'transaction_type', 'voucher_type'],
  description: 'Double-entry ledger for all dealer financial transactions',
  expiration: {
    period: 36,
    unit: 'MONTHS'
  }
};

// Dealer Performance Metrics Table
const DEALER_PERFORMANCE_METRICS_SCHEMA = {
  tableId: 'dealer_performance_metrics',
  schema: {
    fields: [
      {
        name: 'metric_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: METRIC-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'dealer_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'dealer_name',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'metric_date',
        type: 'DATE',
        mode: 'REQUIRED'
      },
      {
        name: 'sales_value_bdt',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'sales_quantity',
        type: 'INT64',
        mode: 'REQUIRED'
      },
      {
        name: 'collection_efficiency',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'stock_turnover_ratio',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'average_payment_delay_days',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'new_customer_acquisition',
        type: 'INT64',
        mode: 'REQUIRED'
      },
      {
        name: 'machine_service_rate',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'performance_score',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'performance_category',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: EXCELLENT, GOOD, FAIR, POOR'
      },
      {
        name: 'created_at',
        type: 'TIMESTAMP',
        mode: 'REQUIRED',
        defaultValue: 'CURRENT_TIMESTAMP()'
      }
    ]
  },
  partitioning: {
    field: 'metric_date',
    type: 'DAY'
  },
  clustering: ['dealer_id', 'performance_category'],
  description: 'Pre-aggregated dealer performance metrics for reporting',
  expiration: {
    period: 24,
    unit: 'MONTHS'
  }
};

// BQML Training Dealer Performance Table
const BQML_TRAINING_DEALER_PERFORMANCE_SCHEMA = {
  tableId: 'bqml_training_dealer_performance',
  schema: {
    fields: [
      {
        name: 'dealer_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'sales_value_bdt',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'collection_efficiency',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'stock_turnover_ratio',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'average_payment_delay_days',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'new_customer_acquisition',
        type: 'INT64',
        mode: 'REQUIRED'
      },
      {
        name: 'machine_service_rate',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'performance_score',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'performance_trend',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: IMPROVING, STABLE, DECLINING'
      },
      {
        name: 'training_date',
        type: 'DATE',
        mode: 'REQUIRED'
      }
    ]
  },
  partitioning: {
    field: 'training_date',
    type: 'DAY'
  },
  clustering: ['dealer_id', 'performance_trend'],
  description: 'Pre-aggregated dealer performance data for BQML model training',
  expiration: {
    period: 90,
    unit: 'DAYS'
  }
};

// Export schemas for use in other modules
module.exports = {
  DEALER_PROFILES_SCHEMA,
  DEALER_CREDIT_TERMS_SCHEMA,
  DEALER_STOCK_TRANSFERS_JOURNAL_SCHEMA,
  DEALER_STOCK_TRANSFERS_CACHE_SCHEMA,
  DEALER_CHALLAN_ITEMS_SCHEMA,
  DEALER_PAYMENT_JOURNAL_SCHEMA,
  DEALER_FINANCIAL_LEDGER_SCHEMA,
  DEALER_PERFORMANCE_METRICS_SCHEMA,
  BQML_TRAINING_DEALER_PERFORMANCE_SCHEMA
};