const path = require('path');
// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: Testing
// Phase: 2
// Component: bigquery_schema_tests
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 19:00 UTC
// Next Step: Implement tests for schema validation
// =============================================

const {
  PAYMENT_RECEIPTS_SCHEMA,
  ACCOUNTING_GENERAL_LEDGER_SCHEMA
} = require('../../bigquery/schemas');

const {
  UI_INTERACTION_PATTERNS_SCHEMA,
  MASTER_CACHE_SCHEMA,
  BQML_TRAINING_UI_OPTIMIZATION_SCHEMA,
  CACHE_UI_OPTIMIZATION_SCHEMA
} = require('../../bigquery/additional_schemas');

describe('BigQuery Schemas', () => {
  describe('Payment Receipts Schema', () => {
    test('should have correct table ID', () => {
      expect(PAYMENT_RECEIPTS_SCHEMA.tableId).toBe('payment_receipts');
    });

    test('should have required fields', () => {
      const fieldNames = PAYMENT_RECEIPTS_SCHEMA.schema.fields.map(field => field.name);
      expect(fieldNames).toContain('receipt_id');
      expect(fieldNames).toContain('payment_timestamp');
      expect(fieldNames).toContain('customer_id');
      expect(fieldNames).toContain('payment_method');
      expect(fieldNames).toContain('payment_amount');
      expect(fieldNames).toContain('receiving_branch_id');
      expect(fieldNames).toContain('approved_by');
      expect(fieldNames).toContain('initiated_by');
      expect(fieldNames).toContain('created_at');
      expect(fieldNames).toContain('updated_at');
    });

    test('should have correct partitioning', () => {
      expect(PAYMENT_RECEIPTS_SCHEMA.partitioning).toEqual({
        field: 'payment_timestamp',
        type: 'DAY'
      });
    });

    test('should have correct clustering', () => {
      expect(PAYMENT_RECEIPTS_SCHEMA.clustering).toEqual([
        'customer_id', 
        'sale_transaction_id', 
        'payment_status'
      ]);
    });

    test('should have 36-month expiration', () => {
      expect(PAYMENT_RECEIPTS_SCHEMA.expiration).toEqual({
        period: 36,
        unit: 'MONTHS'
      });
    });
  });

  describe('Accounting General Ledger Schema', () => {
    test('should have correct table ID', () => {
      expect(ACCOUNTING_GENERAL_LEDGER_SCHEMA.tableId).toBe('accounting_general_ledger');
    });

    test('should have required fields', () => {
      const fieldNames = ACCOUNTING_GENERAL_LEDGER_SCHEMA.schema.fields.map(field => field.name);
      expect(fieldNames).toContain('transaction_id');
      expect(fieldNames).toContain('transaction_date');
      expect(fieldNames).toContain('branch_id');
      expect(fieldNames).toContain('voucher_type');
      expect(fieldNames).toContain('account_head_id');
      expect(fieldNames).toContain('account_head_name');
      expect(fieldNames).toContain('debit_amount');
      expect(fieldNames).toContain('credit_amount');
      expect(fieldNames).toContain('narration');
      expect(fieldNames).toContain('approved_by');
      expect(fieldNames).toContain('entered_by');
      expect(fieldNames).toContain('created_at');
    });

    test('should have correct partitioning', () => {
      expect(ACCOUNTING_GENERAL_LEDGER_SCHEMA.partitioning).toEqual({
        field: 'transaction_date',
        type: 'DAY'
      });
    });

    test('should have correct clustering', () => {
      expect(ACCOUNTING_GENERAL_LEDGER_SCHEMA.clustering).toEqual([
        'branch_id', 
        'account_head_id', 
        'party_id'
      ]);
    });

    test('should have 7-year expiration', () => {
      expect(ACCOUNTING_GENERAL_LEDGER_SCHEMA.expiration).toEqual({
        period: 7,
        unit: 'YEARS'
      });
    });
  });

  describe('UI Interaction Patterns Schema', () => {
    test('should have correct table ID', () => {
      expect(UI_INTERACTION_PATTERNS_SCHEMA.tableId).toBe('ui_interaction_patterns');
    });

    test('should have required fields', () => {
      const fieldNames = UI_INTERACTION_PATTERNS_SCHEMA.schema.fields.map(field => field.name);
      expect(fieldNames).toContain('interaction_id');
      expect(fieldNames).toContain('user_id');
      expect(fieldNames).toContain('interaction_type');
      expect(fieldNames).toContain('target_screen');
      expect(fieldNames).toContain('timestamp');
    });

    test('should have correct partitioning', () => {
      expect(UI_INTERACTION_PATTERNS_SCHEMA.partitioning).toEqual({
        field: 'timestamp',
        type: 'DAY'
      });
    });

    test('should have correct clustering', () => {
      expect(UI_INTERACTION_PATTERNS_SCHEMA.clustering).toEqual([
        'user_id', 
        'department_id', 
        'target_screen'
      ]);
    });

    test('should have 18-month expiration', () => {
      expect(UI_INTERACTION_PATTERNS_SCHEMA.expiration).toEqual({
        period: 18,
        unit: 'MONTHS'
      });
    });
  });

  describe('Master Cache Schema', () => {
    test('should have correct table ID', () => {
      expect(MASTER_CACHE_SCHEMA.tableId).toBe('master_cache');
    });

    test('should have required fields', () => {
      const fieldNames = MASTER_CACHE_SCHEMA.schema.fields.map(field => field.name);
      expect(fieldNames).toContain('cache_key');
      expect(fieldNames).toContain('cached_data');
      expect(fieldNames).toContain('expires_at');
      expect(fieldNames).toContain('created_at');
      expect(fieldNames).toContain('hit_count');
      expect(fieldNames).toContain('last_accessed');
    });

    test('should have correct partitioning', () => {
      expect(MASTER_CACHE_SCHEMA.partitioning).toEqual({
        field: 'expires_at',
        type: 'DAY'
      });
    });

    test('should have correct clustering', () => {
      expect(MASTER_CACHE_SCHEMA.clustering).toEqual(['cache_key']);
    });
  });

  describe('BQML Training UI Optimization Schema', () => {
    test('should have correct table ID', () => {
      expect(BQML_TRAINING_UI_OPTIMIZATION_SCHEMA.tableId).toBe('bqml_training_ui_optimization');
    });

    test('should have required fields', () => {
      const fieldNames = BQML_TRAINING_UI_OPTIMIZATION_SCHEMA.schema.fields.map(field => field.name);
      expect(fieldNames).toContain('user_id');
      expect(fieldNames).toContain('department_id');
      expect(fieldNames).toContain('target_screen');
      expect(fieldNames).toContain('interaction_type');
      expect(fieldNames).toContain('training_date');
    });

    test('should have correct partitioning', () => {
      expect(BQML_TRAINING_UI_OPTIMIZATION_SCHEMA.partitioning).toEqual({
        field: 'training_date',
        type: 'DAY'
      });
    });

    test('should have correct clustering', () => {
      expect(BQML_TRAINING_UI_OPTIMIZATION_SCHEMA.clustering).toEqual([
        'department_id', 
        'target_screen', 
        'interaction_type'
      ]);
    });

    test('should have 60-day expiration', () => {
      expect(BQML_TRAINING_UI_OPTIMIZATION_SCHEMA.expiration).toEqual({
        period: 60,
        unit: 'DAYS'
      });
    });
  });

  describe('Cache UI Optimization Schema', () => {
    test('should have correct table ID', () => {
      expect(CACHE_UI_OPTIMIZATION_SCHEMA.tableId).toBe('cache_ui_optimization');
    });

    test('should have required fields', () => {
      const fieldNames = CACHE_UI_OPTIMIZATION_SCHEMA.schema.fields.map(field => field.name);
      expect(fieldNames).toContain('target_screen');
      expect(fieldNames).toContain('department_id');
      expect(fieldNames).toContain('interaction_type');
      expect(fieldNames).toContain('last_updated');
    });

    test('should have correct partitioning', () => {
      expect(CACHE_UI_OPTIMIZATION_SCHEMA.partitioning).toEqual({
        field: 'last_updated',
        type: 'DAY'
      });
    });

    test('should have correct clustering', () => {
      expect(CACHE_UI_OPTIMIZATION_SCHEMA.clustering).toEqual([
        'department_id', 
        'target_screen'
      ]);
    });

    test('should have 7-day expiration', () => {
      expect(CACHE_UI_OPTIMIZATION_SCHEMA.expiration).toEqual({
        period: 7,
        unit: 'DAYS'
      });
    });
  });
});