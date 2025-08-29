/**
 * BigQuery Table Schemas for Design 10
 * 
 * This file contains the schema definitions for all BigQuery tables
 * as specified in Design 10 of the architecture specification.
 */

// Due Items Table
const DUE_ITEMS_SCHEMA = {
  tableId: 'due_items',
  schema: {
    fields: [
      {
        name: 'due_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: DUE-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'entity_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: CUSTOMER, VENDOR, INTERNAL'
      },
      {
        name: 'entity_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Reference to actual entity'
      },
      {
        name: 'entity_name',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'due_amount',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'due_date',
        type: 'DATE',
        mode: 'REQUIRED'
      },
      {
        name: 'status',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: PENDING, PARTIAL, COMPLETED, OVERDUE'
      },
      {
        name: 'payment_method',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Values: CASH, BANK_TRANSFER, MOBILE_BANKING'
      },
      {
        name: 'payment_reference',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'reminder_count',
        type: 'INT64',
        mode: 'NULLABLE',
        defaultValue: 0
      },
      {
        name: 'last_reminder_timestamp',
        type: 'TIMESTAMP',
        mode: 'NULLABLE'
      },
      {
        name: 'snooze_until',
        type: 'TIMESTAMP',
        mode: 'NULLABLE'
      },
      {
        name: 'priority_level',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: HIGH, MEDIUM, LOW'
      },
      {
        name: 'internal_payment_type',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'For internal payments (ELECTRICITY, RENT, SALARY, etc.)'
      },
      {
        name: 'department_responsible',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Department responsible for payment'
      },
      {
        name: 'recurring_frequency',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Values: DAILY, WEEKLY, MONTHLY, QUARTERLY, ANNUAL'
      },
      {
        name: 'related_cost_center',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Cost center for accounting'
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
    field: 'due_date',
    type: 'DAY'
  },
  clustering: ['entity_type', 'status', 'priority_level'],
  description: 'Centralized due payment schedule with intelligent tracking',
  expiration: {
    period: 36,
    unit: 'MONTHS'
  }
};

// Due Payment Journal Table
const DUE_PAYMENT_JOURNAL_SCHEMA = {
  tableId: 'due_payment_journal',
  schema: {
    fields: [
      {
        name: 'journal_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: JOURNAL-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'due_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'transaction_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: CREATE, PARTIAL_PAYMENT, COMPLETED, REMINDER_SENT'
      },
      {
        name: 'amount',
        type: 'NUMERIC',
        mode: 'NULLABLE'
      },
      {
        name: 'timestamp',
        type: 'TIMESTAMP',
        mode: 'REQUIRED'
      },
      {
        name: 'user_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'details',
        type: 'JSON',
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
    field: 'timestamp',
    type: 'DAY'
  },
  clustering: ['due_id', 'transaction_type'],
  description: 'Append-only journal for all due item changes (immutable record)',
  expiration: {
    period: 36,
    unit: 'MONTHS'
  }
};

// Due Payment Cache Table
const DUE_PAYMENT_CACHE_SCHEMA = {
  tableId: 'due_payment_cache',
  schema: {
    fields: [
      {
        name: 'due_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'entity_type',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'entity_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'entity_name',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'total_due_amount',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'remaining_due_amount',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'due_date',
        type: 'DATE',
        mode: 'REQUIRED'
      },
      {
        name: 'status',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'priority_level',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'customer_reliability_score',
        type: 'FLOAT64',
        mode: 'NULLABLE'
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
  clustering: ['entity_type', 'status', 'priority_level'],
  description: 'Materialized view of current due state for fast user-facing queries',
  expiration: {
    period: 7,
    unit: 'DAYS'
  }
};

// User Forgetfulness Profiles Table
const USER_FORGETFULNESS_PROFILES_SCHEMA = {
  tableId: 'user_forgetfulness_profiles',
  schema: {
    fields: [
      {
        name: 'profile_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: PROF-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'user_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'preferred_snooze_duration',
        type: 'INT64',
        mode: 'REQUIRED',
        description: 'In seconds'
      },
      {
        name: 'optimal_reminder_strategy',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: GENTLE_SNOOZE_FRIENDLY, AGGRESSIVE_EARLY'
      },
      {
        name: 'average_response_time_seconds',
        type: 'INT64',
        mode: 'REQUIRED'
      },
      {
        name: 'snooze_acceptance_rate',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'completion_rate_after_snooze',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'snapshot_date',
        type: 'DATE',
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
    field: 'snapshot_date',
    type: 'DAY'
  },
  clustering: ['user_id', 'optimal_reminder_strategy'],
  description: 'User-specific forgetfulness profiles for personalized snooze options',
  expiration: {
    period: 12,
    unit: 'MONTHS'
  }
};

// CRM Customer Ledger Table
const CRM_CUSTOMER_LEDGER_SCHEMA = {
  tableId: 'crm_customer_ledger',
  schema: {
    fields: [
      {
        name: 'customer_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'customer_name',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'total_due_amount',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'avg_days_to_pay',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'on_time_payment_rate',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'customer_reliability_score',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'machine_breakdown_rate',
        type: 'FLOAT64',
        mode: 'NULLABLE'
      },
      {
        name: 'service_request_frequency',
        type: 'FLOAT64',
        mode: 'NULLABLE'
      },
      {
        name: 'recommended_credit_limit_bdt',
        type: 'NUMERIC',
        mode: 'NULLABLE'
      },
      {
        name: 'last_updated',
        type: 'TIMESTAMP',
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
    field: 'last_updated',
    type: 'DAY'
  },
  clustering: ['customer_reliability_score', 'on_time_payment_rate'],
  description: 'Customer payment profiles with reliability scoring',
  expiration: {
    period: 24,
    unit: 'MONTHS'
  }
};

// BQML Training Customer Payments Table
const BQML_TRAINING_CUSTOMER_PAYMENTS_SCHEMA = {
  tableId: 'bqml_training_customer_payments',
  schema: {
    fields: [
      {
        name: 'user_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'customer_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'days_past_due',
        type: 'INT64',
        mode: 'REQUIRED'
      },
      {
        name: 'total_due_amount',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'avg_days_to_pay',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'on_time_payment_rate',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'customer_reliability_score',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'machine_breakdown_rate',
        type: 'FLOAT64',
        mode: 'NULLABLE'
      },
      {
        name: 'service_request_frequency',
        type: 'FLOAT64',
        mode: 'NULLABLE'
      },
      {
        name: 'paid_on_time',
        type: 'BOOL',
        mode: 'REQUIRED'
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
  clustering: ['customer_reliability_score', 'on_time_payment_rate'],
  description: 'Pre-aggregated customer payment data for BQML model training',
  expiration: {
    period: 90,
    unit: 'DAYS'
  }
};

// Export schemas for use in other modules
module.exports = {
  DUE_ITEMS_SCHEMA,
  DUE_PAYMENT_JOURNAL_SCHEMA,
  DUE_PAYMENT_CACHE_SCHEMA,
  USER_FORGETFULNESS_PROFILES_SCHEMA,
  CRM_CUSTOMER_LEDGER_SCHEMA,
  BQML_TRAINING_CUSTOMER_PAYMENTS_SCHEMA
};