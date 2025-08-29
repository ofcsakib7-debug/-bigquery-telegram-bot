/**
 * BigQuery Table Schemas for Design 9
 * 
 * This file contains the schema definitions for all BigQuery tables
 * as specified in Design 9 of the architecture specification.
 */

// User Permissions Table
const USER_PERMISSIONS_SCHEMA = {
  tableId: 'user_permissions',
  schema: {
    fields: [
      {
        name: 'permission_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: PERM-{ROLE}-{RESOURCE}-{3-random}'
      },
      {
        name: 'role_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: ADMIN, CEO, GM, DM, JM, STAFF, READONLY'
      },
      {
        name: 'resource_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: DEPARTMENT, USER, PAYMENT, INVENTORY, etc.'
      },
      {
        name: 'resource_id',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Specific resource ID (NULL for all)'
      },
      {
        name: 'can_read',
        type: 'BOOL',
        mode: 'REQUIRED'
      },
      {
        name: 'can_add',
        type: 'BOOL',
        mode: 'REQUIRED'
      },
      {
        name: 'can_edit',
        type: 'BOOL',
        mode: 'REQUIRED'
      },
      {
        name: 'can_delete',
        type: 'BOOL',
        mode: 'REQUIRED'
      },
      {
        name: 'time_limit_hours',
        type: 'INT64',
        mode: 'NULLABLE',
        description: 'Time limit for editing (NULL = no limit)'
      },
      {
        name: 'requires_approval_for_edit',
        type: 'BOOL',
        mode: 'REQUIRED'
      },
      {
        name: 'requires_approval_for_delete',
        type: 'BOOL',
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
  clustering: ['role_id', 'resource_type', 'can_edit'],
  description: 'User permissions management with time-based restrictions',
  expiration: {
    period: 36,
    unit: 'MONTHS'
  }
};

// Department Menus Table
const DEPARTMENT_MENUS_SCHEMA = {
  tableId: 'department_menus',
  schema: {
    fields: [
      {
        name: 'menu_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: MENU-{DEPT}-{ROLE}-{3-random}'
      },
      {
        name: 'department_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: FINANCE, INVENTORY, SERVICE, SALES, HR, MANAGEMENT'
      },
      {
        name: 'role_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: ADMIN, CEO, GM, DM, JM, STAFF, READONLY'
      },
      {
        name: 'menu_name',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'menu_structure',
        type: 'JSON',
        mode: 'REQUIRED',
        description: 'JSON structure of the menu'
      },
      {
        name: 'can_add',
        type: 'BOOL',
        mode: 'REQUIRED'
      },
      {
        name: 'can_edit',
        type: 'BOOL',
        mode: 'REQUIRED'
      },
      {
        name: 'can_delete',
        type: 'BOOL',
        mode: 'REQUIRED'
      },
      {
        name: 'time_limit_hours',
        type: 'INT64',
        mode: 'NULLABLE',
        description: 'Time limit for editing (NULL = no limit)'
      },
      {
        name: 'requires_approval_for_edit',
        type: 'BOOL',
        mode: 'REQUIRED'
      },
      {
        name: 'requires_approval_for_delete',
        type: 'BOOL',
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
  clustering: ['department_id', 'role_id', 'can_edit'],
  description: 'Department-specific menus with role-based access control',
  expiration: {
    period: 24,
    unit: 'MONTHS'
  }
};

// Audit Trails Table
const AUDIT_TRAILS_SCHEMA = {
  tableId: 'audit_trails',
  schema: {
    fields: [
      {
        name: 'audit_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: AUDIT-{YYYYMMDD}-{3-random}'
      },
      {
        name: 'original_record_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'action_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: CREATE, EDIT, DELETE, APPROVE'
      },
      {
        name: 'user_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'role_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'department_id',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'timestamp',
        type: 'TIMESTAMP',
        mode: 'REQUIRED'
      },
      {
        name: 'old_value',
        type: 'JSON',
        mode: 'NULLABLE'
      },
      {
        name: 'new_value',
        type: 'JSON',
        mode: 'NULLABLE'
      },
      {
        name: 'approval_required',
        type: 'BOOL',
        mode: 'REQUIRED'
      },
      {
        name: 'approval_status',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Values: PENDING, APPROVED, REJECTED'
      },
      {
        name: 'approved_by',
        type: 'STRING',
        mode: 'NULLABLE'
      },
      {
        name: 'approved_timestamp',
        type: 'TIMESTAMP',
        mode: 'NULLABLE'
      },
      {
        name: 'reason_for_change',
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
    field: 'timestamp',
    type: 'DAY'
  },
  clustering: ['department_id', 'action_type', 'approval_status'],
  description: 'Comprehensive audit trail for all record changes',
  expiration: {
    period: 36,
    unit: 'MONTHS'
  }
};

// Approval Workflows Table
const APPROVAL_WORKFLOWS_SCHEMA = {
  tableId: 'approval_workflows',
  schema: {
    fields: [
      {
        name: 'workflow_id',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Format: WF-{ACTION}-{3-random}'
      },
      {
        name: 'action_type',
        type: 'STRING',
        mode: 'REQUIRED',
        description: 'Values: EDIT, DELETE'
      },
      {
        name: 'resource_type',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'from_role',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'to_role',
        type: 'STRING',
        mode: 'REQUIRED'
      },
      {
        name: 'time_threshold_hours',
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
  clustering: ['action_type', 'resource_type', 'from_role'],
  description: 'Approval workflow definitions based on time thresholds',
  expiration: {
    period: 24,
    unit: 'MONTHS'
  }
};

// Admin Management Table (updated for Design 9)
const ADMIN_MANAGEMENT_SCHEMA_DESIGN9 = {
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
        description: 'Values: ADD_ROLE, EDIT_ROLE, DELETE_ROLE, ADD_USER, EDIT_USER, DELETE_USER'
      },
      {
        name: 'target_id',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Role ID or User ID'
      },
      {
        name: 'target_name',
        type: 'STRING',
        mode: 'NULLABLE',
        description: 'Role name or User name'
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

// Export schemas for use in other modules
module.exports = {
  USER_PERMISSIONS_SCHEMA,
  DEPARTMENT_MENUS_SCHEMA,
  AUDIT_TRAILS_SCHEMA,
  APPROVAL_WORKFLOWS_SCHEMA,
  ADMIN_MANAGEMENT_SCHEMA_DESIGN9
};