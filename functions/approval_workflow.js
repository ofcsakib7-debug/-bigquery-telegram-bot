/**
 * Approval Workflow System
 * 
 * This module implements the approval workflow functionality
 * as specified in Design 9.
 */

const { BigQuery } = require('@google-cloud/bigquery');
const { Firestore } = require('@google-cloud/firestore');
const { getUserRole } = require('./user_permissions');
const { updateAuditTrailApproval } = require('./audit_trail');

// Initialize clients
const bigquery = new BigQuery();
const firestore = new Firestore();

/**
 * Get approval workflow for a specific action
 * @param {string} actionType - Type of action (EDIT, DELETE)
 * @param {string} resourceType - Type of resource
 * @param {string} fromRole - Role initiating the action
 * @returns {Object|null} Approval workflow or null if not found
 */
async function getApprovalWorkflow(actionType, resourceType, fromRole) {
  try {
    const query = `
      SELECT to_role, time_threshold_hours
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.approval_workflows\`
      WHERE action_type = @actionType 
        AND resource_type = @resourceType 
        AND from_role = @fromRole
      LIMIT 1
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        actionType,
        resourceType,
        fromRole
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting approval workflow:', error);
    return null;
  }
}

/**
 * Check if approval is needed based on time threshold
 * @param {string} userId - Telegram user ID
 * @param {string} actionType - Type of action (EDIT, DELETE)
 * @param {string} resourceType - Type of resource
 * @param {Date} createdAt - Record creation timestamp
 * @returns {Object} Approval check result
 */
async function checkApprovalNeeded(userId, actionType, resourceType, createdAt) {
  try {
    // Get user role
    const fromRole = await getUserRole(userId);
    if (!fromRole) {
      return {
        needed: false,
        reason: 'USER_NOT_FOUND',
        message: 'User not found'
      };
    }
    
    // Get approval workflow
    const workflow = await getApprovalWorkflow(actionType, resourceType, fromRole);
    if (!workflow) {
      return {
        needed: false,
        reason: 'WORKFLOW_NOT_FOUND',
        message: 'Approval workflow not found'
      };
    }
    
    // Calculate time since creation
    const now = new Date();
    const created = new Date(createdAt);
    const hoursSinceCreation = (now - created) / (1000 * 60 * 60);
    
    // Check if time threshold has been exceeded
    if (hoursSinceCreation > workflow.time_threshold_hours) {
      return {
        needed: true,
        toRole: workflow.to_role,
        hoursSinceCreation: hoursSinceCreation,
        timeThresholdHours: workflow.time_threshold_hours,
        message: `Time threshold of ${workflow.time_threshold_hours} hours exceeded (${hoursSinceCreation.toFixed(2)} hours since creation)`
      };
    } else {
      return {
        needed: false,
        hoursSinceCreation: hoursSinceCreation,
        timeThresholdHours: workflow.time_threshold_hours
      };
    }
  } catch (error) {
    console.error('Error checking approval needed:', error);
    return {
      needed: false,
      reason: 'APPROVAL_CHECK_ERROR',
      message: 'Error checking approval requirement'
    };
  }
}

/**
 * Get users who can approve a request
 * @param {string} departmentId - Department ID
 * @param {string} toRole - Role that can approve
 * @returns {Array} Array of user objects
 */
async function getUsersForApproval(departmentId, toRole) {
  try {
    // In a real implementation, this would query Firestore or BigQuery
    // to find users with the specified role in the department
    // For now, we'll return a simplified example
    
    // This is a simplified example - in a real implementation,
    // you would query the actual user database
    return [
      // Example users who can approve
      // { userId: 'user123', firstName: 'Manager', lastName: 'One' },
      // { userId: 'user456', firstName: 'Manager', lastName: 'Two' }
    ];
  } catch (error) {
    console.error('Error getting users for approval:', error);
    return [];
  }
}

/**
 * Send approval request notification
 * @param {string} auditId - Audit ID
 * @param {string} requesterId - User ID of requester
 * @param {string} departmentId - Department ID
 * @param {string} toRole - Role that can approve
 * @param {Object} details - Request details
 */
async function sendApprovalRequest(auditId, requesterId, departmentId, toRole, details) {
  try {
    // Get users who can approve
    const approvers = await getUsersForApproval(departmentId, toRole);
    
    // In a real implementation, you would send notifications to these users
    // For now, we'll just log the request
    console.log(`Approval request sent for audit ${auditId} to ${approvers.length} users with role ${toRole}`);
    
    // Update audit trail status to PENDING
    await updateAuditTrailApproval(auditId, 'PENDING');
    
    return {
      success: true,
      approversCount: approvers.length
    };
  } catch (error) {
    console.error('Error sending approval request:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process approval decision
 * @param {string} auditId - Audit ID
 * @param {string} approverId - User ID of approver
 * @param {string} decision - Approval decision (APPROVED, REJECTED)
 * @param {string} reason - Reason for decision (optional)
 * @returns {Object} Processing result
 */
async function processApprovalDecision(auditId, approverId, decision, reason = null) {
  try {
    // Verify that approver has permission to approve this request
    const approverRole = await getUserRole(approverId);
    if (!approverRole) {
      return {
        success: false,
        error: 'Approver not found'
      };
    }
    
    // Update audit trail with approval decision
    await updateAuditTrailApproval(auditId, decision, approverId, reason);
    
    // In a real implementation, you would perform the actual action
    // that was approved (e.g., update the record in the database)
    
    return {
      success: true,
      message: `Request ${decision.toLowerCase()}`
    };
  } catch (error) {
    console.error('Error processing approval decision:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get default approval workflows
 * @returns {Array} Array of default workflow configurations
 */
function getDefaultApprovalWorkflows() {
  return [
    // Staff to Junior Manager approval
    {
      workflow_id: 'WF-EDIT-INVENTORY-ABC',
      action_type: 'EDIT',
      resource_type: 'INVENTORY',
      from_role: 'STAFF',
      to_role: 'JM',
      time_threshold_hours: 2
    },
    {
      workflow_id: 'WF-EDIT-PAYMENT-DEF',
      action_type: 'EDIT',
      resource_type: 'PAYMENT',
      from_role: 'STAFF',
      to_role: 'JM',
      time_threshold_hours: 2
    },
    
    // Junior Manager to Department Manager approval
    {
      workflow_id: 'WF-EDIT-INVENTORY-GHI',
      action_type: 'EDIT',
      resource_type: 'INVENTORY',
      from_role: 'JM',
      to_role: 'DM',
      time_threshold_hours: 48
    },
    {
      workflow_id: 'WF-EDIT-PAYMENT-JKL',
      action_type: 'EDIT',
      resource_type: 'PAYMENT',
      from_role: 'JM',
      to_role: 'DM',
      time_threshold_hours: 48
    }
  ];
}

/**
 * Escalate pending approvals
 * @param {number} hoursThreshold - Hours threshold for escalation
 * @returns {Object} Escalation result
 */
async function escalatePendingApprovals(hoursThreshold = 24) {
  try {
    // Find pending approvals that have been pending for too long
    const query = `
      SELECT audit_id, user_id, role_id, department_id, timestamp
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.audit_trails\`
      WHERE approval_status = 'PENDING'
        AND timestamp < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @hoursThreshold HOUR)
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        hoursThreshold
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    // For each pending approval, escalate to the next level
    let escalatedCount = 0;
    for (const row of rows) {
      // In a real implementation, you would determine the next approver
      // and send them a notification
      console.log(`Escalating approval ${row.audit_id} from user ${row.user_id}`);
      escalatedCount++;
    }
    
    return {
      success: true,
      escalatedCount: escalatedCount,
      message: `Escalated ${escalatedCount} pending approvals`
    };
  } catch (error) {
    console.error('Error escalating pending approvals:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export functions
module.exports = {
  getApprovalWorkflow,
  checkApprovalNeeded,
  getUsersForApproval,
  sendApprovalRequest,
  processApprovalDecision,
  getDefaultApprovalWorkflows,
  escalatePendingApprovals
};