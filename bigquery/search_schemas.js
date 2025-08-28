// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 6
// Phase: 1
// Component: search_schemas
// Status: IN_PROGRESS
// Last Modified: 2025-08-26 12:00 UTC
// Next Step: Implement search functionality
// =============================================

/**
 * BigQuery Table Schemas for BQML-Powered Context-Aware Search
 * 
 * This file contains the schema definitions for the search-related BigQuery tables
 * as specified in Design 6, Phase 1 of the architecture specification.
 */

// Primary Search Patterns Table (The Search Intelligence Engine)
const SEARCH_INTENTION_PATTERNS_SCHEMA = {
  tableId: 'search_intention_patterns',
  schema: {
    fields: [
      {
        name: 'pattern_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: PATTERN-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'department_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: ACCOUNTING, MARKETING, INVENTORY, SERVICE, SALES, HR, MANAGEMENT'
      },
      {
        name: 'pattern',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'The input pattern (e.g., "t bnk p cm")'
      },
      {
        name: 'expanded_query',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'The full query it represents (e.g., "total bank payments current month")'
      },
      {
        name: 'query_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: PAYMENT, CHALLAN, STOCK, VISIT, EXPENSE, REPORT, QUANTITY_STOCK, etc.'
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
  clustering: ['department_id', 'query_type', 'priority_score'],
  description: 'Department-specific search patterns with usage tracking for BQML training',
  expiration: {
    period: 36,
    unit: 'MONTHS'
  }
};

// Search Interactions Tracking Table
const SEARCH_INTERACTIONS_SCHEMA = {
  tableId: 'search_interactions',
  schema: {
    fields: [
      {
        name: 'interaction_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: INT-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'user_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Telegram user ID'
      },
      {
        name: 'department_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: ACCOUNTING, MARKETING, INVENTORY, etc.'
      },
      {
        name: 'input_text',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'The text user entered (e.g., "t bnk p cm")'
      },
      {
        name: 'interpreted_query',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'The interpreted query (e.g., "total bank payments current month")'
      },
      {
        name: 'query_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: PAYMENT, CHALLAN, STOCK, QUANTITY_STOCK, etc.'
      },
      {
        name: 'confidence_score',
        type: 'FLOAT64',
        mode: 'REQUIRED',
        description: '0.0-1.0 scale'
      },
      {
        name: 'selected_alternative',
        type: 'BOOL',
        mode: 'NULLABLE',
        defaultValue: false,
        description: 'TRUE if user selected an alternative option'
      },
      {
        name: 'successful_completion',
        type: 'BOOL',
        mode: 'REQUIRED',
        description: 'TRUE if the search led to successful action'
      },
      {
        name: 'timestamp',
        type: 'TIMESTAMP',
        mode: 'REQUIRED'
      }
    ]
  },
  partitioning: {
    field: 'timestamp',
    type: 'DAY'
  },
  clustering: ['department_id', 'query_type', 'successful_completion'],
  description: 'Tracking of all search interactions for BQML model training',
  expiration: {
    period: 12,
    unit: 'MONTHS'
  }
};

// BQML Training Data Infrastructure
const BQML_TRAINING_SEARCH_SCHEMA = {
  tableId: 'bqml_training_search',
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
        name: 'input_text',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'interpreted_query',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'query_type',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'confidence_score',
        type: 'FLOAT64',
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
        name: 'previous_queries',
        type: 'STRING',
        mode: 'REPEATED',
        description: 'Last 3 queries (max)'
      },
      {
        name: 'successful_completion',
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
  clustering: ['department_id', 'query_type', 'hour_of_day'],
  description: 'Pre-aggregated search interaction data for BQML model training',
  expiration: {
    period: 90,
    unit: 'DAYS'
  }
};

// Department-Specific Cache Tables Schema Factory
function createDepartmentSearchCacheSchema(department) {
  const deptLower = department.toLowerCase();
  return {
    tableId: `${deptLower}_search_cache`,
    schema: {
      fields: [
        {
          name: 'cache_key',
          type: 'STRING',
          mode: 'REQUIRED',
          description: `Format: "${deptLower}:{{query}}:{{user_id}}"`
        },
        {
          name: 'result_data',
          type: 'STRING',
          mode: 'REQUIRED',
          description: 'JSON of search results'
        },
        {
          name: 'expires_at',
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
        },
        {
          name: 'created_at',
          type: 'TIMESTAMP',
          mode: 'REQUIRED',
          defaultValue: 'CURRENT_TIMESTAMP()'
        },
        {
          name: 'user_context',
          type: 'STRING',
          mode: 'NULLABLE',
          description: 'JSON of user-specific context'
        }
      ]
    },
    partitioning: {
      field: 'expires_at',
      type: 'DAY'
    },
    clustering: ['user_id', 'query_type'],
    description: 'Department-specific search cache with user context',
    expiration: {
      period: 12,
      unit: 'HOURS' // Standard expiration
    }
  };
}

// Multi-Model Quantity Search Infrastructure
const MULTI_MODEL_QUANTITY_SEARCH_CACHE_SCHEMA = {
  tableId: 'multi_model_quantity_search_cache',
  schema: {
    fields: [
      {
        name: 'cache_key',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: "inv:{{query}}:{{user_id}}"'
      },
      {
        name: 'model_results',
        type: 'RECORD',
        mode: 'REPEATED',
        fields: [
          {
            name: 'model_code',
            type: 'STRING',
            mode: 'NULLABLE'
          },
          {
            name: 'model_name',
            type: 'STRING',
            mode: 'NULLABLE'
          },
          {
            name: 'quantity',
            type: 'INT64',
            mode: 'NULLABLE'
          },
          {
            name: 'bottom_price',
            type: 'FLOAT64',
            mode: 'NULLABLE'
          },
          {
            name: 'total_price',
            type: 'FLOAT64',
            mode: 'NULLABLE'
          },
          {
            name: 'branch_availability',
            type: 'RECORD',
            mode: 'REPEATED',
            fields: [
              {
                name: 'branch',
                type: 'STRING',
                mode: 'NULLABLE'
              },
              {
                name: 'stock',
                type: 'INT64',
                mode: 'NULLABLE'
              }
            ]
          }
        ]
      },
      {
        name: 'recent_quotes',
        type: 'RECORD',
        mode: 'REPEATED',
        fields: [
          {
            name: 'model_code',
            type: 'STRING',
            mode: 'NULLABLE'
          },
          {
            name: 'customer_name',
            type: 'STRING',
            mode: 'NULLABLE'
          },
          {
            name: 'unit_price',
            type: 'FLOAT64',
            mode: 'NULLABLE'
          },
          {
            name: 'quotation_date',
            type: 'DATE',
            mode: 'NULLABLE'
          }
        ]
      },
      {
        name: 'expires_at',
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
    field: 'expires_at',
    type: 'DAY'
  },
  clustering: ['user_id', 'model_count'],
  description: 'Cache for multi-model quantity search results to minimize BigQuery processing',
  expiration: {
    period: 30,
    unit: 'MINUTES' // More volatile data
  }
};

// Marketing Department Recent Quotes Table
const MARKETING_RECENT_QUOTES_SCHEMA = {
  tableId: 'marketing_recent_quotes',
  schema: {
    fields: [
      {
        name: 'quote_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: QUOTE-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'machine_model_id',
        type: 'STRING',
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
        mode: 'REQUIRED'
      },
      {
        name: 'unit_price',
        type: 'FLOAT64',
        mode: 'REQUIRED'
      },
      {
        name: 'quotation_date',
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
    field: 'quotation_date',
    type: 'DAY'
  },
  clustering: ['machine_model_id', 'quotation_date'],
  description: 'Recent quoted prices for marketing team pricing intelligence',
  expiration: {
    period: 180,
    unit: 'DAYS'
  }
};

// Export schemas for use in other modules
module.exports = {
  SEARCH_INTENTION_PATTERNS_SCHEMA,
  SEARCH_INTERACTIONS_SCHEMA,
  BQML_TRAINING_SEARCH_SCHEMA,
  createDepartmentSearchCacheSchema,
  MULTI_MODEL_QUANTITY_SEARCH_CACHE_SCHEMA,
  MARKETING_RECENT_QUOTES_SCHEMA
};