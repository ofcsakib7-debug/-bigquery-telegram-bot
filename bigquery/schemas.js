// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 1
// Phase: 2
// Component: bigquery_schema_definitions
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 11:30 UTC
// Next Step: Implement payment_receipts table schema
// =============================================

/**
 * BigQuery Table Schemas for Design 1
 * 
 * This file contains the schema definitions for all BigQuery tables
 * as specified in Design 1, Phase 2 of the architecture specification.
 */

// Payment Receipts Table (The Central Payment Hub)
const PAYMENT_RECEIPTS_SCHEMA = {
  tableId: 'payment_receipts',
  schema: {
    fields: [
      {
        name: 'receipt_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: RCP-{YYYYMMDD}-{3-random-chars}'
      },
      {
        name: 'payment_timestamp',
        type: 'TIMESTAMP',
        mode: 'REQUIRED'
      },
      {
        name: 'customer_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'customer_name',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'sale_transaction_id',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'NULL for walk-in payments'
      },
      {
        name: 'total_invoice_amount',
        type: 'FLOAT64',
        mode: 'NULLABLE'
      },
      {
        name: 'payment_method',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: CASH, BANK_TRANSFER, CHEQUE, MOBILE_FINANCE'
      },
      {
        name: 'bank_account_number',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Last 4 digits only for display'
      },
      {
        name: 'cheque_number',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'payment_amount',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'receiving_branch_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'sale_branch_id',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'NULL if same as receiving branch'
      },
      {
        name: 'is_advance',
        type: 'BOOL',
        mode: 'NULLABLE'
      },
      {
        name: 'approved_by',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Telegram user ID'
      },
      {
        name: 'initiated_by',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Telegram user ID'
      },
      {
        name: 'evidence_id',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Reference to payment_evidence table'
      },
      {
        name: 'evidence_path',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Cloud Storage path'
      },
      {
        name: 'auto_verified',
        type: 'BOOL',
        mode: 'NULLABLE',
        defaultValue: false
      },
      {
        name: 'detected_amount',
        type: 'FLOAT64',
        mode: 'NULLABLE'
      },
      {
        name: 'created_at',
        type: 'TIMESTAMP',
        mode: 'REQUIRED'
      },
      {
        name: 'updated_at',
        type: 'TIMESTAMP',
        mode: 'REQUIRED'
      }
    ]
  },
  partitioning: {
    field: 'payment_timestamp',
    type: 'DAY'
  },
  clustering: ['customer_id', 'sale_transaction_id', 'payment_status'],
  description: 'Central hub for all payment receipts with strict partitioning and clustering',
  expiration: {
    period: 36,
    unit: 'MONTHS'
  }
};

// Accounting General Ledger Table (The Financial Truth)
const ACCOUNTING_GENERAL_LEDGER_SCHEMA = {
  tableId: 'accounting_general_ledger',
  schema: {
    fields: [
      {
        name: 'transaction_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: GL-{YYYYMMDD}-{3-random-chars}'
      },
      {
        name: 'transaction_date',
        type: 'DATE',
        mode: 'REQUIRED'
      },
      {
        name: 'branch_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'voucher_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: PAYMENT_VOUCHER, JOURNAL_VOUCHER'
      },
      {
        name: 'account_head_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'account_head_name',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'debit_amount',
        type: 'FLOAT64',
        mode: 'NULLABLE'
      },
      {
        name: 'credit_amount',
        type: 'FLOAT64',
        mode: 'NULLABLE'
      },
      {
        name: 'currency',
        type: 'STRING',
        mode: 'NULLABLE',
        defaultValue: 'BDT'
      },
      {
        name: 'exchange_rate',
        type: 'FLOAT64',
        mode: 'NULLABLE'
      },
      {
        name: 'party_type',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Values: CUSTOMER, SUPPLIER, EMPLOYEE, INTERNAL'
      },
      {
        name: 'party_id',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'narration',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'reference_id',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Links to source document (challan, receipt, etc.)'
      },
      {
        name: 'evidence_path',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'approved_by',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'entry_type',
        type: 'STRING',
        mode: 'NULLABLE',
        defaultValue: 'MANUAL',
        description: 'Values: MANUAL, AUTO'
      },
      {
        name: 'entered_by',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'created_at',
        type: 'TIMESTAMP',
        mode: 'REQUIRED'
      }
    ]
  },
  partitioning: {
    field: 'transaction_date',
    type: 'DAY'
  },
  clustering: ['branch_id', 'account_head_id', 'party_id'],
  description: 'Immutable record of all financial transactions with double-entry bookkeeping',
  expiration: {
    period: 7,
    unit: 'YEARS'
  }
};

// Export schemas for use in other modules
module.exports = {
  PAYMENT_RECEIPTS_SCHEMA,
  ACCOUNTING_GENERAL_LEDGER_SCHEMA
};