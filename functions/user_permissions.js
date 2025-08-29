/**
 * User Permissions Management System
 * 
 * This module implements the user permissions management functionality
 * as specified in Design 9.
 */

const { BigQuery } = require('@google-cloud/bigquery');
const { Firestore } = require('@google-cloud/firestore');

// Initialize clients
const bigquery = new BigQuery();
const firestore = new Firestore();

/**
 * Check if user has permission to perform an action
 * @param {string} userId - Telegram user ID
 * @param {string} resourceType - Type of resource (DEPARTMENT, USER, PAYMENT, INVENTORY, etc.)
 * @param {string} action - Action to perform (read, add, edit, delete)
 * @param {string} resourceId - Specific resource ID (optional)
 * @returns {Object} Permission check result
 */
async function checkUserPermission(userId, resourceType, action, resourceId = null) {
  try {
    // Layer 1: Role Check (must complete within 5ms, zero BigQuery quota)
    const userRole = await getUserRole(userId);
    if (!userRole) {
      return {
        allowed: false,
        reason: 'USER_NOT_FOUND',
        message: 'User not found'
      };
    }

    // Check if user is admin (full access)
    if (userRole === 'ADMIN') {
      return {
        allowed: true,
        role: userRole
      };
    }

    // Layer 2: Time Limit Check (must complete within 10ms, zero BigQuery quota)
    // For edit and delete actions, check time limits
    if (action === 'edit' || action === 'delete') {
      const timeLimitResult = await checkTimeLimit(userRole, resourceType);
      if (!timeLimitResult.allowed) {
        return timeLimitResult;
      }
    }

    // Layer 3: Permission Check (uses BigQuery if needed)
    const permissionResult = await checkPermissionInBigQuery(userRole, resourceType, action, resourceId);
    
    return {
      allowed: permissionResult.allowed,
      role: userRole,
      requiresApproval: permissionResult.requiresApproval,
      timeLimitHours: permissionResult.timeLimitHours,
      message: permissionResult.message
    };
  } catch (error) {
    console.error('Error checking user permission:', error);
    return {
      allowed: false,
      reason: 'PERMISSION_CHECK_ERROR',
      message: 'Error checking permissions'
    };
  }
}

/**
 * Get user role from Firestore
 * @param {string} userId - Telegram user ID
 * @returns {string|null} User role or null if not found
 */
async function getUserRole(userId) {
  try {
    const userDoc = await firestore.collection('user_profiles').doc(userId.toString()).get();
    const userProfile = userDoc.data();
    
    return userProfile ? userProfile.role : null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

/**
 * Check time limit for user role and resource type
 * @param {string} role - User role
 * @param {string} resourceType - Type of resource
 * @returns {Object} Time limit check result
 */
async function checkTimeLimit(role, resourceType) {
  try {
    // Define time limits for different roles
    const timeLimits = {
      'STAFF': 2,      // 2 hours
      'JM': 48,        // 48 hours (2 days)
      'DM': 168,       // 168 hours (7 days)
      'GM': 168,       // 168 hours (7 days)
      'CEO': null,     // No time limit
      'ADMIN': null    // No time limit
    };

    const timeLimitHours = timeLimits[role] || 168; // Default to 7 days

    return {
      allowed: true,
      timeLimitHours: timeLimitHours
    };
  } catch (error) {
    console.error('Error checking time limit:', error);
    return {
      allowed: false,
      reason: 'TIME_LIMIT_CHECK_ERROR',
      message: 'Error checking time limits'
    };
  }
}

/**
 * Check permission in BigQuery
 * @param {string} role - User role
 * @param {string} resourceType - Type of resource
 * @param {string} action - Action to perform
 * @param {string} resourceId - Specific resource ID (optional)
 * @returns {Object} Permission check result
 */
async function checkPermissionInBigQuery(role, resourceType, action, resourceId = null) {
  try {
    let query = `
      SELECT can_${action} as allowed, requires_approval_for_${action} as requires_approval, time_limit_hours
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.user_permissions\`
      WHERE role_id = @role AND resource_type = @resourceType
    `;

    const params = {
      role,
      resourceType
    };

    // Add resource ID filter if provided
    if (resourceId) {
      query += ' AND (resource_id = @resourceId OR resource_id IS NULL)';
      params.resourceId = resourceId;
    } else {
      query += ' AND resource_id IS NULL';
    }

    query += ' LIMIT 1';

    const options = {
      query: query,
      location: 'US',
      params: params
    };

    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    if (rows.length > 0) {
      const permission = rows[0];
      return {
        allowed: permission.allowed,
        requiresApproval: permission.requires_approval,
        timeLimitHours: permission.time_limit_hours
      };
    } else {
      // Default deny if no permission found
      return {
        allowed: false,
        requiresApproval: false,
        timeLimitHours: null
      };
    }
  } catch (error) {
    console.error('Error checking permission in BigQuery:', error);
    return {
      allowed: false,
      requiresApproval: false,
      timeLimitHours: null
    };
  }
}

/**
 * Get user permissions for a specific resource
 * @param {string} userId - Telegram user ID
 * @param {string} resourceType - Type of resource
 * @param {string} resourceId - Specific resource ID (optional)
 * @returns {Object} User permissions
 */
async function getUserPermissions(userId, resourceType, resourceId = null) {
  try {
    const userRole = await getUserRole(userId);
    if (!userRole) {
      return null;
    }

    let query = `
      SELECT can_read, can_add, can_edit, can_delete, time_limit_hours, 
             requires_approval_for_edit, requires_approval_for_delete
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.user_permissions\`
      WHERE role_id = @role AND resource_type = @resourceType
    `;

    const params = {
      role: userRole,
      resourceType
    };

    // Add resource ID filter if provided
    if (resourceId) {
      query += ' AND (resource_id = @resourceId OR resource_id IS NULL)';
      params.resourceId = resourceId;
    } else {
      query += ' AND resource_id IS NULL';
    }

    query += ' LIMIT 1';

    const options = {
      query: query,
      location: 'US',
      params: params
    };

    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();

    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return null;
  }
}

/**
 * Check if user can edit a record based on creation time
 * @param {string} userId - Telegram user ID
 * @param {string} resourceType - Type of resource
 * @param {Date} createdAt - Record creation timestamp
 * @returns {Object} Edit permission result
 */
async function canEditRecord(userId, resourceType, createdAt) {
  try {
    const userRole = await getUserRole(userId);
    if (!userRole) {
      return {
        allowed: false,
        reason: 'USER_NOT_FOUND',
        message: 'User not found'
      };
    }

    // Admins can always edit
    if (userRole === 'ADMIN') {
      return {
        allowed: true,
        role: userRole
      };
    }

    // Get time limit for user role
    const timeLimitResult = await checkTimeLimit(userRole, resourceType);
    const timeLimitHours = timeLimitResult.timeLimitHours;

    // If no time limit, user can edit
    if (timeLimitHours === null) {
      return {
        allowed: true,
        role: userRole
      };
    }

    // Calculate time since creation
    const now = new Date();
    const created = new Date(createdAt);
    const hoursSinceCreation = (now - created) / (1000 * 60 * 60);

    // Check if within time limit
    if (hoursSinceCreation <= timeLimitHours) {
      return {
        allowed: true,
        role: userRole,
        hoursSinceCreation: hoursSinceCreation,
        timeLimitHours: timeLimitHours
      };
    } else {
      // Check if approval is required
      const permission = await getUserPermissions(userId, resourceType);
      const requiresApproval = permission ? permission.requires_approval_for_edit : true;

      return {
        allowed: false,
        role: userRole,
        hoursSinceCreation: hoursSinceCreation,
        timeLimitHours: timeLimitHours,
        requiresApproval: requiresApproval,
        message: `Time limit exceeded. ${requiresApproval ? 'Approval required for edit.' : 'Edit not allowed.'}`
      };
    }
  } catch (error) {
    console.error('Error checking edit permission:', error);
    return {
      allowed: false,
      reason: 'EDIT_PERMISSION_CHECK_ERROR',
      message: 'Error checking edit permission'
    };
  }
}

// Export functions
module.exports = {
  checkUserPermission,
  getUserRole,
  checkTimeLimit,
  checkPermissionInBigQuery,
  getUserPermissions,
  canEditRecord
};