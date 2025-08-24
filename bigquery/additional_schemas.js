// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 1
// Phase: 2
// Component: remaining_bigquery_schemas
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 15:00 UTC
// Next Step: Implement table creation functions
// =============================================

/**
 * BigQuery Table Schemas for Design 1 (continued)
 * 
 * This file contains the schema definitions for the remaining BigQuery tables
 * as specified in Design 1, Phase 2 of the architecture specification.
 */

// UI Interaction Patterns Table (The UX Intelligence Engine)
const UI_INTERACTION_PATTERNS_SCHEMA = {
  tableId: 'ui_interaction_patterns',
  schema: {
    fields: [
      {
        name: 'interaction_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: INT-{timestamp}-{3-random-chars}'
      },
      {
        name: 'user_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'department_id',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'bot_id',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'interaction_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: COMMAND, BUTTON, TEXT_INPUT, SNOOZE'
      },
      {
        name: 'target_screen',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'action_taken',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'snooze_duration',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Values: 30m, 1h, 2h, work_end, tomorrow'
      },
      {
        name: 'response_time_seconds',
        type: 'FLOAT64',
        mode: 'NULLABLE'
      },
      {
        name: 'error_flag',
        type: 'BOOL',
        mode: 'NULLABLE'
      },
      {
        name: 'error_type',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Values: VALIDATION, TIMEOUT, FORMAT, PERMISSION'
      },
      {
        name: 'previous_screens',
        type: 'STRING',
        mode: 'REPEATED',
        description: 'Max 5 most recent screens'
      },
      {
        name: 'timestamp',
        type: 'TIMESTAMP',
        mode: 'REQUIRED'
      },
      {
        name: 'device_info',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'is_first_time',
        type: 'BOOL',
        mode: 'NULLABLE'
      },
      {
        name: 'completed_workflow',
        type: 'BOOL',
        mode: 'NULLABLE'
      }
    ]
  },
  partitioning: {
    field: 'timestamp',
    type: 'DAY'
  },
  clustering: ['user_id', 'department_id', 'target_screen'],
  description: 'Tracks UI interaction patterns for BQML analysis to optimize Telegram interface',
  expiration: {
    period: 18,
    unit: 'MONTHS'
  }
};

// Master Cache Table (The Quota-Saving Keystone)
const MASTER_CACHE_SCHEMA = {
  tableId: 'master_cache',
  schema: {
    fields: [
      {
        name: 'cache_key',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: type:user_id:context'
      },
      {
        name: 'cached_data',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'JSON representation of cached data'
      },
      {
        name: 'expires_at',
        type: 'TIMESTAMP',
        mode: 'REQUIRED'
      },
      {
        name: 'created_at',
        type: 'TIMESTAMP',
        mode: 'REQUIRED'
      },
      {
        name: 'hit_count',
        type: 'INT64',
        mode: 'NULLABLE',
        defaultValue: 0
      },
      {
        name: 'last_accessed',
        type: 'TIMESTAMP',
        mode: 'NULLABLE'
      }
    ]
  },
  partitioning: {
    field: 'expires_at',
    type: 'DAY'
  },
  clustering: ['cache_key'],
  description: 'Central cache for frequently accessed data patterns to minimize quota usage'
};

// BQML Training UI Optimization Table (The BQML Training Ground)
const BQML_TRAINING_UI_OPTIMIZATION_SCHEMA = {
  tableId: 'bqml_training_ui_optimization',
  schema: {
    fields: [
      {
        name: 'user_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'department_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'target_screen',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'interaction_type',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'avg_response_time',
        type: 'FLOAT64',
        mode: 'NULLABLE'
      },
      {
        name: 'error_rate',
        type: 'FLOAT64',
        mode: 'NULLABLE'
      },
      {
        name: 'common_snooze_patterns',
        type: 'RECORD',
        mode: 'REPEATED',
        fields: [
          {
            name: 'snooze_duration',
            type: 'STRING',
            mode: 'NULLABLE'
          },
          {
            name: 'count',
            type: 'INT64',
            mode: 'NULLABLE'
          }
        ]
      },
      {
        name: 'completion_rate',
        type: 'FLOAT64',
        mode: 'NULLABLE'
      },
      {
        name: 'new_user_rate',
        type: 'FLOAT64',
        mode: 'NULLABLE'
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
  clustering: ['department_id', 'target_screen', 'interaction_type'],
  description: 'Pre-aggregated data for training BQML models to optimize UI experience',
  expiration: {
    period: 60,
    unit: 'DAYS'
  }
};

// Cache UI Optimization Table (The Real-Time UI Optimizer)
const CACHE_UI_OPTIMIZATION_SCHEMA = {
  tableId: 'cache_ui_optimization',
  schema: {
    fields: [
      {
        name: 'target_screen',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'department_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'interaction_type',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'avg_response_time',
        type: 'FLOAT64',
        mode: 'NULLABLE'
      },
      {
        name: 'error_rate',
        type: 'FLOAT64',
        mode: 'NULLABLE'
      },
      {
        name: 'completion_rate',
        type: 'FLOAT64',
        mode: 'NULLABLE'
      },
      {
        name: 'common_snooze_patterns',
        type: 'RECORD',
        mode: 'REPEATED',
        fields: [
          {
            name: 'snooze_duration',
            type: 'STRING',
            mode: 'NULLABLE'
          },
          {
            name: 'count',
            type: 'INT64',
            mode: 'NULLABLE'
          }
        ]
      },
      {
        name: 'needs_improvement',
        type: 'BOOL',
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
  clustering: ['department_id', 'target_screen'],
  description: 'Real-time UI optimization recommendations from BQML model predictions',
  expiration: {
    period: 7,
    unit: 'DAYS'
  }
};

// Export schemas for use in other modules
module.exports = {
  UI_INTERACTION_PATTERNS_SCHEMA,
  MASTER_CACHE_SCHEMA,
  BQML_TRAINING_UI_OPTIMIZATION_SCHEMA,
  CACHE_UI_OPTIMIZATION_SCHEMA
};