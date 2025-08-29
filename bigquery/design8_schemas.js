/**
 * BigQuery Table Schemas for Design 8
 * 
 * This file contains the schema definitions for all BigQuery tables
 * as specified in Design 8 of the architecture specification.
 */

// Command Patterns Table
const COMMAND_PATTERNS_SCHEMA = {
  tableId: 'command_patterns',
  schema: {
    fields: [
      {
        name: 'pattern_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: PATTERN-{DEPT}-{TYPE}-{3-random}'
      },
      {
        name: 'department_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: ADMIN, FINANCE, INVENTORY, SERVICE, SALES, HR, MANAGEMENT'
      },
      {
        name: 'pattern_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: INPUT, ADD, EDIT, DELETE, ADMIN'
      },
      {
        name: 'pattern',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Regex pattern for validation'
      },
      {
        name: 'description',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'parsing_logic',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'How to extract values'
      },
      {
        name: 'sample_input',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'sample_output',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'priority_score',
        type: 'FLOAT64',
        mode: 'REQUIRED',
        description: '0.0-1.0 scale (1.0 = highest priority)'
      },
      {
        name: 'usage_count',
        type: 'INT64',
        mode: 'NULLABLE',
        defaultValue: 0
      },
      {
        name: 'last_used',
        type: 'TIMESTAMP',
        mode: 'NULLABLE'
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
    field: 'created_at',
    type: 'DAY'
  },
  clustering: ['department_id', 'pattern_type', 'priority_score'],
  description: 'Department-specific command patterns for multi-input processing',
  expiration: {
    period: 36,
    unit: 'MONTHS'
  }
};

// Pre-listed Items Table
const PRELISTED_ITEMS_SCHEMA = {
  tableId: 'prelisted_items',
  schema: {
    fields: [
      {
        name: 'item_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: ITEM-{DEPT}-{TYPE}-{3-random}'
      },
      {
        name: 'department_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'item_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: MACHINE, ACCOUNT, TECHNICIAN, DEPARTMENT, etc.'
      },
      {
        name: 'item_code',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Short code for input (e.g., "a2b")'
      },
      {
        name: 'item_name',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'item_description',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'user_specific',
        type: 'BOOL',
        mode: 'REQUIRED'
      },
      {
        name: 'user_id',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'NULL for organization-wide items'
      },
      {
        name: 'usage_count',
        type: 'INT64',
        mode: 'NULLABLE',
        defaultValue: 0
      },
      {
        name: 'last_used',
        type: 'TIMESTAMP',
        mode: 'NULLABLE'
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
    field: 'created_at',
    type: 'DAY'
  },
  clustering: ['department_id', 'item_type', 'user_specific'],
  description: 'Pre-listed items for department-specific input',
  expiration: {
    period: 24,
    unit: 'MONTHS'
  }
};

// Contextual Actions Table
const CONTEXTUAL_ACTIONS_SCHEMA = {
  tableId: 'contextual_actions',
  schema: {
    fields: [
      {
        name: 'action_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: ACTION-{DEPT}-{CONTEXT}-{3-random}'
      },
      {
        name: 'department_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'context_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: RESULT, ERROR, EMPTY, etc.'
      },
      {
        name: 'primary_intent',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'The main intent of the current context'
      },
      {
        name: 'suggested_action',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'The action to suggest'
      },
      {
        name: 'action_text',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Text to display on the button'
      },
      {
        name: 'action_data',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Callback data for the button'
      },
      {
        name: 'confidence_score',
        type: 'FLOAT64',
        mode: 'REQUIRED',
        description: '0.0-1.0 scale'
      },
      {
        name: 'usage_count',
        type: 'INT64',
        mode: 'NULLABLE',
        defaultValue: 0
      },
      {
        name: 'last_used',
        type: 'TIMESTAMP',
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
    field: 'created_at',
    type: 'DAY'
  },
  clustering: ['department_id', 'context_type', 'primary_intent'],
  description: 'Contextual action suggestions for intelligent navigation',
  expiration: {
    period: 12,
    unit: 'MONTHS'
  }
};

// Admin Management Table
const ADMIN_MANAGEMENT_SCHEMA = {
  tableId: 'admin_management',
  schema: {
    fields: [
      {
        name: 'admin_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: ADMIN-{ACTION}-{3-random}'
      },
      {
        name: 'action_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: ADD_DEPT, DELETE_DEPT, EDIT_DEPT, LIST_USERS'
      },
      {
        name: 'target_id',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Department ID or User ID'
      },
      {
        name: 'target_name',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Department name or User name'
      },
      {
        name: 'performed_by',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'User ID of admin performing action'
      },
      {
        name: 'timestamp',
        type: 'TIMESTAMP',
        mode: 'REQUIRED'
      },
      {
        name: 'status',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: PENDING, COMPLETED, CANCELLED'
      },
      {
        name: 'details',
        type: 'JSON',
        mode: 'NULLABLE',
        description: 'Additional details specific to action type'
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
  clustering: ['action_type', 'status'],
  description: 'Audit log for admin management actions',
  expiration: {
    period: 36,
    unit: 'MONTHS'
  }
};

// BQML Training Contextual Actions Table
const BQML_TRAINING_CONTEXTUAL_ACTIONS_SCHEMA = {
  tableId: 'bqml_training_contextual_actions',
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
        name: 'context_type',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'primary_intent',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'suggested_actions',
        type: 'STRING',
        mode: 'REPEATED'
      },
      {
        name: 'selected_action',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'hour_of_day',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: "00"-"23"'
      },
      {
        name: 'day_of_week',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: MONDAY, TUESDAY, ..., SUNDAY'
      },
      {
        name: 'user_role',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'confidence_score',
        type: 'FLOAT64',
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
  clustering: ['department_id', 'context_type', 'primary_intent'],
  description: 'Pre-aggregated contextual action data for BQML model training',
  expiration: {
    period: 90,
    unit: 'DAYS'
  }
};

// Export schemas for use in other modules
module.exports = {
  COMMAND_PATTERNS_SCHEMA,
  PRELISTED_ITEMS_SCHEMA,
  CONTEXTUAL_ACTIONS_SCHEMA,
  ADMIN_MANAGEMENT_SCHEMA,
  BQML_TRAINING_CONTEXTUAL_ACTIONS_SCHEMA
};