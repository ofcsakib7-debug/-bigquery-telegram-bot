/**
 * BigQuery Table Schemas for Design 12
 * 
 * This file contains the schema definitions for all BigQuery tables
 * as specified in Design 12 of the architecture specification.
 */

// Salesperson Commission Agreements Table
const SALESPERSON_COMMISSION_AGREEMENTS_SCHEMA = {
  tableId: 'salesperson_commission_agreements',
  schema: {
    fields: [
      {
        name: 'agreement_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: AGREEMENT-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'salesperson_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'salesperson_name',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'role_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: EXECUTIVE, SENIOR, MANAGER'
      },
      {
        name: 'effective_from',
        type: 'DATE',
        mode: 'REQUIRED'
      },
      {
        name: 'effective_to',
        type: 'DATE',
        mode: 'NULLABLE'
      },
      {
        name: 'agreement_status',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: ACTIVE, INACTIVE, PENDING'
      },
      {
        name: 'approved_by',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'CEO/Manager Telegram User ID'
      },
      {
        name: 'approved_at',
        type: 'TIMESTAMP',
        mode: 'REQUIRED'
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
    field: 'effective_from',
    type: 'DAY'
  },
  clustering: ['salesperson_id', 'agreement_status'],
  description: 'Personalized commission agreements for each salesperson',
  expiration: {
    period: 24,
    unit: 'MONTHS'
  }
};

// Salesperson Commission Tiers Table
const SALESPERSON_COMMISSION_TIERS_SCHEMA = {
  tableId: 'salesperson_commission_tiers',
  schema: {
    fields: [
      {
        name: 'tier_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: TIER-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'agreement_id',
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
        name: 'minimum_sales_value_bdt',
        type: 'NUMERIC',
        mode: 'NULLABLE'
      },
      {
        name: 'commission_rate',
        type: 'FLOAT64',
        mode: 'REQUIRED',
        description: 'Percentage specific to this salesperson'
      },
      {
        name: 'tier_description',
        type: 'STRING',
        mode: 'REQUIRED'
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
  clustering: ['agreement_id', 'machine_model_id'],
  description: 'Commission tiers specific to each salesperson agreement',
  expiration: {
    period: 24,
    unit: 'MONTHS'
  }
};

// Personalized Commission Tracking Table
const PERSONALIZED_COMMISSION_TRACKING_SCHEMA = {
  tableId: 'personalized_commission_tracking',
  schema: {
    fields: [
      {
        name: 'tracking_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: TRACK-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'challan_number',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'sale_transaction_id',
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
        name: 'sale_price_bdt',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'applicable_agreement_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'applicable_tier_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'commission_rate',
        type: 'FLOAT64',
        mode: 'REQUIRED',
        description: 'Individual rate for this sale'
      },
      {
        name: 'commission_amount_bdt',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'marketing_incentive_bdt',
        type: 'NUMERIC',
        mode: 'NULLABLE'
      },
      {
        name: 'marketing_staff_id',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'marketing_staff_name',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'marketing_activity_id',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'salesperson_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'salesperson_name',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'commission_calculated_date',
        type: 'DATE',
        mode: 'REQUIRED'
      },
      {
        name: 'commission_due_date',
        type: 'DATE',
        mode: 'REQUIRED'
      },
      {
        name: 'commission_paid_date',
        type: 'DATE',
        mode: 'NULLABLE'
      },
      {
        name: 'payment_status',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: PENDING, PROCESSING, PAID'
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
    field: 'commission_calculated_date',
    type: 'DAY'
  },
  clustering: ['challan_number', 'salesperson_id'],
  description: 'Tracking of personalized commissions for all sales linked to challan numbers',
  expiration: {
    period: 24,
    unit: 'MONTHS'
  }
};

// Marketing Staff Incentives Table
const MARKETING_STAFF_INCENTIVES_SCHEMA = {
  tableId: 'marketing_staff_incentives',
  schema: {
    fields: [
      {
        name: 'incentive_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: INCENT-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'marketing_staff_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'marketing_staff_name',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'activity_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'activity_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: VISIT, MEETING, DEMO'
      },
      {
        name: 'activity_date',
        type: 'DATE',
        mode: 'REQUIRED'
      },
      {
        name: 'challan_number',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'sale_transaction_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'incentive_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: NEW_CUSTOMER, LEAD_QUALITY'
      },
      {
        name: 'incentive_amount_bdt',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'verification_status',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: PENDING, VERIFIED, REJECTED'
      },
      {
        name: 'verification_notes',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'verified_by',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'verified_at',
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
    field: 'activity_date',
    type: 'DAY'
  },
  clustering: ['marketing_staff_id', 'verification_status'],
  description: 'Marketing staff incentives with verification workflow',
  expiration: {
    period: 24,
    unit: 'MONTHS'
  }
};

// Transportation Costs Table
const TRANSPORTATION_COSTS_SCHEMA = {
  tableId: 'transportation_costs',
  schema: {
    fields: [
      {
        name: 'transport_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: TRANSPORT-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'challan_number',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'vehicle_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'vehicle_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: VAN, TRUCK, BIKE'
      },
      {
        name: 'total_cost_bdt',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'customer_agreed_to_pay',
        type: 'BOOL',
        mode: 'REQUIRED'
      },
      {
        name: 'customer_payment_bdt',
        type: 'NUMERIC',
        mode: 'NULLABLE'
      },
      {
        name: 'company_covered_bdt',
        type: 'NUMERIC',
        mode: 'NULLABLE'
      },
      {
        name: 'approval_required',
        type: 'BOOL',
        mode: 'REQUIRED'
      },
      {
        name: 'approved_by',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Manager Telegram User ID'
      },
      {
        name: 'approved_at',
        type: 'TIMESTAMP',
        mode: 'NULLABLE'
      },
      {
        name: 'approval_notes',
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
    field: 'created_at',
    type: 'DAY'
  },
  clustering: ['challan_number', 'vehicle_id'],
  description: 'Transportation costs linked to challan numbers with approval tracking',
  expiration: {
    period: 24,
    unit: 'MONTHS'
  }
};

// Challan-Commission Integration Table
const CHALLAN_COMMISSION_INTEGRATION_SCHEMA = {
  tableId: 'challan_commission_integration',
  schema: {
    fields: [
      {
        name: 'integration_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: INTEG-{YYYYMMDD}-{3-random}'
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
        name: 'salesperson_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'salesperson_name',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'salesperson_agreement_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'salesperson_commission_rate',
        type: 'FLOAT64',
        mode: 'REQUIRED',
        description: 'Individual rate'
      },
      {
        name: 'salesperson_commission_bdt',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'marketing_staff_id',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'marketing_staff_name',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'marketing_incentive_bdt',
        type: 'NUMERIC',
        mode: 'NULLABLE'
      },
      {
        name: 'total_commission_bdt',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'transportation_cost_bdt',
        type: 'NUMERIC',
        mode: 'REQUIRED'
      },
      {
        name: 'customer_transport_payment_bdt',
        type: 'NUMERIC',
        mode: 'NULLABLE'
      },
      {
        name: 'company_transport_covered_bdt',
        type: 'NUMERIC',
        mode: 'NULLABLE'
      },
      {
        name: 'commission_due_date',
        type: 'DATE',
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
  clustering: ['challan_number'],
  description: 'Integrated view of personalized commission and transportation costs for fast user-facing queries',
  expiration: {
    period: 7,
    unit: 'DAYS'
  }
};

// Export schemas for use in other modules
module.exports = {
  SALESPERSON_COMMISSION_AGREEMENTS_SCHEMA,
  SALESPERSON_COMMISSION_TIERS_SCHEMA,
  PERSONALIZED_COMMISSION_TRACKING_SCHEMA,
  MARKETING_STAFF_INCENTIVES_SCHEMA,
  TRANSPORTATION_COSTS_SCHEMA,
  CHALLAN_COMMISSION_INTEGRATION_SCHEMA
};