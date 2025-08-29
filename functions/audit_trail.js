/**
 * Audit Trail System
 * 
 * This module implements the audit trail functionality
 * as specified in Design 9.
 */

const { BigQuery } = require('@google-cloud/bigquery');
const { Firestore } = require('@google-cloud/firestore');
const { getUserRole } = require('./user_permissions');

// Initialize clients
const bigquery = new BigQuery();
const firestore = new Firestore();

/**
 * Log an action to the audit trail
 * @param {string} originalRecordId - Original record ID
 * @param {string} actionType - Type of action (CREATE, EDIT, DELETE, APPROVE)
 * @param {string} userId - Telegram user ID
 * @param {string} departmentId - Department ID
 * @param {Object} oldValue - Old value (optional)
 * @param {Object} newValue - New value (optional)
 * @param {boolean} approvalRequired - Whether approval is required
 * @param {string} reasonForChange - Reason for change (optional)
 * @returns {string} Audit ID
 */
async function logAuditTrail(originalRecordId, actionType, userId, departmentId, oldValue = null, newValue = null, approvalRequired = false, reasonForChange = null) {
  try {
    // Generate audit ID
    const auditId = `AUDIT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Get user role
    const roleId = await getUserRole(userId);
    
    // Insert audit trail record
    const query = `
      INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.audit_trails\`
      (audit_id, original_record_id, action_type, user_id, role_id, department_id, timestamp, 
       old_value, new_value, approval_required, created_at)
      VALUES
      (@auditId, @originalRecordId, @actionType, @userId, @roleId, @departmentId, @timestamp, 
       @oldValue, @newValue, @approvalRequired, @createdAt)
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        auditId,
        originalRecordId,
        actionType,
        userId,
        roleId,
        departmentId,
        timestamp: new Date().toISOString(),
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
        approvalRequired,
        createdAt: new Date().toISOString()
      }
    };
    
    await bigquery.createQueryJob(options);
    
    return auditId;
  } catch (error) {
    console.error('Error logging audit trail:', error);
    throw error;
  }
}

/**
 * Update audit trail with approval information
 * @param {string} auditId - Audit ID
 * @param {string} approvalStatus - Approval status (PENDING, APPROVED, REJECTED)
 * @param {string} approvedBy - User ID of approver (optional)
 * @param {string} reason - Reason for approval/rejection (optional)
 */
async function updateAuditTrailApproval(auditId, approvalStatus, approvedBy = null, reason = null) {
  try {
    const query = `
      UPDATE \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.audit_trails\`
      SET approval_status = @approvalStatus, 
          approved_by = @approvedBy, 
          approved_timestamp = @approvedTimestamp,
          reason_for_change = COALESCE(reason_for_change, @reason)
      WHERE audit_id = @auditId
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        auditId,
        approvalStatus,
        approvedBy,
        approvedTimestamp: new Date().toISOString(),
        reason
      }
    };
    
    await bigquery.createQueryJob(options);
  } catch (error) {
    console.error('Error updating audit trail approval:', error);
    throw error;
  }
}

/**
 * Get audit trail for a specific record
 * @param {string} originalRecordId - Original record ID
 * @returns {Array} Array of audit trail records
 */
async function getAuditTrailForRecord(originalRecordId) {
  try {
    const query = `
      SELECT audit_id, action_type, user_id, role_id, timestamp, old_value, new_value, 
             approval_required, approval_status, approved_by, approved_timestamp, reason_for_change
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.audit_trails\`
      WHERE original_record_id = @originalRecordId
      ORDER BY timestamp ASC
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        originalRecordId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    // Parse JSON fields
    return rows.map(row => ({
      ...row,
      old_value: row.old_value ? JSON.parse(row.old_value) : null,
      new_value: row.new_value ? JSON.parse(row.new_value) : null
    }));
  } catch (error) {
    console.error('Error getting audit trail for record:', error);
    return [];
  }
}

/**
 * Get pending approvals for a user
 * @param {string} userId - Telegram user ID
 * @param {string} departmentId - Department ID
 * @returns {Array} Array of pending approval records
 */
async function getPendingApprovals(userId, departmentId) {
  try {
    // Get user role
    const userRole = await getUserRole(userId);
    
    // Get pending approvals that this user can approve
    const query = `
      SELECT a.audit_id, a.original_record_id, a.action_type, a.user_id, a.role_id, a.timestamp, 
             a.old_value, a.new_value, a.reason_for_change, u.firstName as requester_name
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.audit_trails\` a
      JOIN \`${process.env.FIRESTORE_PROJECT_ID || 'project'}.user_profiles\` u ON a.user_id = u.userId
      WHERE a.department_id = @departmentId 
        AND a.approval_status = 'PENDING'
        AND a.role_id IN (
          SELECT from_role 
          FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.approval_workflows\`
          WHERE to_role = @userRole
        )
      ORDER BY a.timestamp ASC
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        departmentId,
        userRole
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    // Parse JSON fields
    return rows.map(row => ({
      ...row,
      old_value: row.old_value ? JSON.parse(row.old_value) : null,
      new_value: row.new_value ? JSON.parse(row.new_value) : null
    }));
  } catch (error) {
    console.error('Error getting pending approvals:', error);
    return [];
  }
}

/**
 * Check if a record change requires approval
 * @param {string} userId - Telegram user ID
 * @param {string} resourceType - Type of resource
 * @param {Date} createdAt - Record creation timestamp
 * @param {string} action - Action being performed (edit, delete)
 * @returns {Object} Approval requirement result
 */
async function checkApprovalRequirement(userId, resourceType, createdAt, action) {
  try {
    // Get user role
    const userRole = await getUserRole(userId);
    if (!userRole) {
      return {
        required: false,
        reason: 'USER_NOT_FOUND',
        message: 'User not found'
      };
    }

    // Admins don't need approval
    if (userRole === 'ADMIN') {
      return {
        required: false
      };
    }

    // Get time limit for user role
    const query = `
      SELECT time_limit_hours, requires_approval_for_${action} as requires_approval
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.user_permissions\`
      WHERE role_id = @userRole AND resource_type = @resourceType
      LIMIT 1
    `;

    const options = {
      query: query,
      location: 'US',
      params: {
        userRole,
        resourceType
      }
    };

    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    if (rows.length === 0) {
      return {
        required: false,
        reason: 'PERMISSION_NOT_FOUND',
        message: 'Permission not found'
      };
    }

    const permission = rows[0];
    
    // If approval is not required by permission, no approval needed
    if (!permission.requires_approval) {
      return {
        required: false
      };
    }

    // Check time limit
    const timeLimitHours = permission.time_limit_hours;
    
    // If no time limit, no approval needed
    if (timeLimitHours === null) {
      return {
        required: false
      };
    }

    // Calculate time since creation
    const now = new Date();
    const created = new Date(createdAt);
    const hoursSinceCreation = (now - created) / (1000 * 60 * 60);

    // Check if time limit has been exceeded
    if (hoursSinceCreation > timeLimitHours) {
      return {
        required: true,
        hoursSinceCreation: hoursSinceCreation,
        timeLimitHours: timeLimitHours,
        message: `Time limit of ${timeLimitHours} hours exceeded (${hoursSinceCreation.toFixed(2)} hours since creation)`
      };
    } else {
      return {
        required: false,
        hoursSinceCreation: hoursSinceCreation,
        timeLimitHours: timeLimitHours
      };
    }
  } catch (error) {
    console.error('Error checking approval requirement:', error);
    return {
      required: false,
      reason: 'APPROVAL_CHECK_ERROR',
      message: 'Error checking approval requirement'
    };
  }
}

// Export functions
module.exports = {
  logAuditTrail,
  updateAuditTrailApproval,
  getAuditTrailForRecord,
  getPendingApprovals,
  checkApprovalRequirement
};
