/**
 * Admin Management System
 * 
 * This module implements the admin management functionality
 * as specified in Design 8 and Design 9.
 */

const { BigQuery } = require('@google-cloud/bigquery');
const { Firestore } = require('@google-cloud/firestore');

// Initialize clients
const bigquery = new BigQuery();
const firestore = new Firestore();

/**
 * Check if user has admin privileges
 * @param {string} userId - Telegram user ID
 * @returns {boolean} True if user has admin privileges
 */
async function isAdmin(userId) {
  try {
    const userDoc = await firestore.collection('user_profiles').doc(userId.toString()).get();
    const userProfile = userDoc.data();
    
    return userProfile && (userProfile.role === 'ADMIN' || userProfile.role === 'admin' || userProfile.role === 'manager');
  } catch (error) {
    console.error('Error checking admin privileges:', error);
    return false;
  }
}

/**
 * Handle admin command
 * @param {string} userId - Telegram user ID
 * @returns {Object} Response with admin options
 */
async function handleAdminCommand(userId) {
  try {
    // Verify admin privileges
    if (!(await isAdmin(userId))) {
      return {
        valid: false,
        errorType: 'UNAUTHORIZED',
        errorMessage: "You don't have permission to perform admin actions",
        suggestions: [
          {
            text: "?? Back to Main Menu",
            callback_data: "menu:main"
          }
        ]
      };
    }
    
    // Generate admin management options
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "1?? Manage Roles",
            callback_data: "admin:manage_roles"
          }
        ],
        [
          {
            text: "2?? Manage Users",
            callback_data: "admin:manage_users"
          }
        ],
        [
          {
            text: "3?? View Audit Logs",
            callback_data: "admin:view_audit"
          }
        ],
        [
          {
            text: "4?? Add Department",
            callback_data: "admin:add_dept"
          }
        ],
        [
          {
            text: "5?? Edit Department",
            callback_data: "admin:edit_dept"
          }
        ],
        [
          {
            text: "6?? Delete Department",
            callback_data: "admin:delete_dept"
          }
        ],
        [
          {
            text: "?? Back to Main Menu",
            callback_data: "menu:main"
          }
        ]
      ]
    };
    
    return {
      valid: true,
      message: "*Admin Management*\n\nWhat would you like to manage?",
      keyboard
    };
  } catch (error) {
    console.error('Error handling admin command:', error);
    return {
      valid: false,
      errorType: 'ADMIN_ERROR',
      errorMessage: "Error processing admin request",
      suggestions: [
        {
          text: "?? Back to Main Menu",
          callback_data: "menu:main"
        }
      ]
    };
  }
}

/**
 * Log admin action to BigQuery
 * @param {string} actionType - Type of action (ADD_DEPT, DELETE_DEPT, etc.)
 * @param {string} userId - User ID performing the action
 * @param {Object} details - Additional details about the action
 * @returns {string} Admin action ID
 */
async function logAdminAction(actionType, userId, details = {}) {
  try {
    // Generate admin ID
    const adminId = `ADMIN-${actionType}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    const query = `
      INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.admin_management\`
      (admin_id, action_type, performed_by, timestamp, status, details)
      VALUES
      (@adminId, @actionType, @userId, @timestamp, @status, @details)
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        adminId,
        actionType,
        userId,
        timestamp: new Date().toISOString(),
        status: 'PENDING',
        details: JSON.stringify(details)
      }
    };
    
    await bigquery.createQueryJob(options);
    
    return adminId;
  } catch (error) {
    console.error('Error logging admin action:', error);
    return null;
  }
}

/**
 * Update admin action status
 * @param {string} adminId - Admin action ID
 * @param {string} status - New status (PENDING, COMPLETED, CANCELLED)
 * @param {Object} details - Additional details
 */
async function updateAdminActionStatus(adminId, status, details = {}) {
  try {
    const query = `
      UPDATE \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.admin_management\`
      SET status = @status, details = @details
      WHERE admin_id = @adminId
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        adminId,
        status,
        details: JSON.stringify(details)
      }
    };
    
    await bigquery.createQueryJob(options);
  } catch (error) {
    console.error('Error updating admin action status:', error);
  }
}

/**
 * Get department list
 * @returns {Array} Array of department objects
 */
async function getDepartments() {
  try {
    // In a real implementation, this would query a departments table
    // For now, we'll return a static list
    return [
      { id: 'ADMIN', name: 'Administration' },
      { id: 'FINANCE', name: 'Finance' },
      { id: 'INVENTORY', name: 'Inventory' },
      { id: 'SERVICE', name: 'Service' },
      { id: 'SALES', name: 'Sales' },
      { id: 'HR', name: 'Human Resources' },
      { id: 'MANAGEMENT', name: 'Management' }
    ];
  } catch (error) {
    console.error('Error getting departments:', error);
    return [];
  }
}

/**
 * Handle manage roles command
 * @param {string} userId - Telegram user ID
 * @returns {Object} Response with role management options
 */
async function handleManageRoles(userId) {
  try {
    // Verify admin privileges
    if (!(await isAdmin(userId))) {
      return {
        valid: false,
        errorType: 'UNAUTHORIZED',
        errorMessage: "You don't have permission to perform admin actions",
        suggestions: [
          {
            text: "?? Back to Main Menu",
            callback_data: "menu:main"
          }
        ]
      };
    }
    
    // Generate role management options
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "1?? Add New Role",
            callback_data: "admin:add_role"
          }
        ],
        [
          {
            text: "2?? Edit Existing Role",
            callback_data: "admin:edit_role"
          }
        ],
        [
          {
            text: "3?? Delete Role",
            callback_data: "admin:delete_role"
          }
        ],
        [
          {
            text: "?? Back to Admin Menu",
            callback_data: "admin:main"
          }
        ]
      ]
    };
    
    return {
      valid: true,
      message: "*Role Management*\n\nSelect action:",
      keyboard
    };
  } catch (error) {
    console.error('Error handling manage roles command:', error);
    return {
      valid: false,
      errorType: 'ADMIN_ERROR',
      errorMessage: "Error processing role management request",
      suggestions: [
        {
          text: "?? Back to Admin Menu",
          callback_data: "admin:main"
        }
      ]
    };
  }
}

/**
 * Handle edit existing role command
 * @param {string} userId - Telegram user ID
 * @returns {Object} Response with role selection options
 */
async function handleEditExistingRole(userId) {
  try {
    // Verify admin privileges
    if (!(await isAdmin(userId))) {
      return {
        valid: false,
        errorType: 'UNAUTHORIZED',
        errorMessage: "You don't have permission to perform admin actions",
        suggestions: [
          {
            text: "?? Back to Main Menu",
            callback_data: "menu:main"
          }
        ]
      };
    }
    
    // Generate role selection options
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "1?? Staff",
            callback_data: "admin:edit_role:STAFF"
          }
        ],
        [
          {
            text: "2?? Junior Manager",
            callback_data: "admin:edit_role:JM"
          }
        ],
        [
          {
            text: "3?? Department Manager",
            callback_data: "admin:edit_role:DM"
          }
        ],
        [
          {
            text: "4?? General Manager",
            callback_data: "admin:edit_role:GM"
          }
        ],
        [
          {
            text: "5?? CEO",
            callback_data: "admin:edit_role:CEO"
          }
        ],
        [
          {
            text: "6?? Admin",
            callback_data: "admin:edit_role:ADMIN"
          }
        ],
        [
          {
            text: "7?? ReadOnly",
            callback_data: "admin:edit_role:READONLY"
          }
        ],
        [
          {
            text: "?? Back to Role Management",
            callback_data: "admin:manage_roles"
          }
        ]
      ]
    };
    
    return {
      valid: true,
      message: "*Edit Role Permissions*\n\nSelect role to edit:",
      keyboard
    };
  } catch (error) {
    console.error('Error handling edit existing role command:', error);
    return {
      valid: false,
      errorType: 'ADMIN_ERROR',
      errorMessage: "Error processing role edit request",
      suggestions: [
        {
          text: "?? Back to Role Management",
          callback_data: "admin:manage_roles"
        }
      ]
    };
  }
}

/**
 * Add new department
 * @param {string} deptName - Department name
 * @param {string} userId - User ID performing the action
 * @returns {Object} Result of the operation
 */
async function addDepartment(deptName, userId) {
  try {
    // Log the action
    const adminId = await logAdminAction('ADD_DEPT', userId, { deptName });
    
    // Validate department name
    if (!deptName || !/^[a-zA-Z0-9]+$/.test(deptName)) {
      await updateAdminActionStatus(adminId, 'CANCELLED', { reason: 'Invalid department name' });
      
      return {
        valid: false,
        errorType: 'INVALID_DEPT_NAME',
        errorMessage: "Department name must be alphanumeric",
        suggestions: [
          {
            text: "Try Again",
            callback_data: "admin:add_dept"
          },
          {
            text: "?? Back to Admin Menu",
            callback_data: "admin:main"
          }
        ]
      };
    }
    
    // In a real implementation, we would add the department to a departments table
    // For now, we'll just simulate the operation
    await updateAdminActionStatus(adminId, 'COMPLETED', { deptName });
    
    return {
      valid: true,
      message: `Department "${deptName}" added successfully`,
      suggestions: [
        {
          text: "Manage Another Department",
          callback_data: "admin:main"
        },
        {
          text: "?? Back to Main Menu",
          callback_data: "menu:main"
        }
      ]
    };
  } catch (error) {
    console.error('Error adding department:', error);
    return {
      valid: false,
      errorType: 'ADD_DEPT_ERROR',
      errorMessage: "Error adding department",
      suggestions: [
        {
          text: "Try Again",
          callback_data: "admin:add_dept"
        },
        {
          text: "?? Back to Admin Menu",
          callback_data: "admin:main"
        }
      ]
    };
  }
}

// Export functions
module.exports = {
  isAdmin,
  handleAdminCommand,
  handleManageRoles,
  handleEditExistingRole,
  logAdminAction,
  updateAdminActionStatus,
  getDepartments,
  addDepartment
};