// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 1
// Phase: 3
// Component: department_workflows
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 15:30 UTC
// Next Step: Implement role-based access control
// =============================================

const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore
const firestore = new Firestore();

/**
 * Get department-specific options for a user
 * @param {string} userId - Telegram user ID
 * @returns {Object} Department-specific options
 */
async function getDepartmentOptions(userId) {
  try {
    // Get user profile
    const userDoc = await firestore.collection('user_profiles').doc(userId.toString()).get();
    const userProfile = userDoc.data();
    
    if (!userProfile) {
      // Return default options if no user profile
      return getDefaultOptions();
    }
    
    // Return department-specific options
    return getOptionsForDepartment(userProfile.departmentId, userProfile.role);
  } catch (error) {
    console.error('Error getting department options:', error);
    return getDefaultOptions();
  }
}

/**
 * Get options for a specific department
 * @param {string} departmentId - Department ID
 * @param {string} role - User role
 * @returns {Object} Department-specific options
 */
function getOptionsForDepartment(departmentId, role) {
  switch (departmentId) {
    case 'finance':
      return getFinanceDepartmentOptions(role);
    case 'sales':
      return getSalesDepartmentOptions(role);
    case 'service':
      return getServiceDepartmentOptions(role);
    default:
      return getDefaultOptions();
  }
}

/**
 * Get Finance & Store Department options
 * @param {string} role - User role
 * @returns {Object} Finance department options
 */
function getFinanceDepartmentOptions(role) {
  const baseOptions = [
    { text: "💰 Record Payment", callback_data: "action:record_payment" },
    { text: "📝 Log Expense", callback_data: "action:log_expense" },
    { text: "📊 View Reports", callback_data: "action:view_reports" }
  ];
  
  // Add admin options for managers
  if (role === 'manager' || role === 'admin') {
    baseOptions.push(
      { text: "🏦 Bank Management", callback_data: "action:bank_management" },
      { text: "📊 Accounting Heads", callback_data: "action:accounting_heads" }
    );
  }
  
  return baseOptions;
}

/**
 * Get Sales Department options
 * @param {string} role - User role
 * @returns {Object} Sales department options
 */
function getSalesDepartmentOptions(role) {
  const baseOptions = [
    { text: "🚚 Log Delivery Challan", callback_data: "action:log_delivery" },
    { text: "💰 Record Customer Payment", callback_data: "action:record_customer_payment" },
    { text: "📱 View Customer List", callback_data: "action:view_customers" }
  ];
  
  // Add admin options for managers
  if (role === 'manager' || role === 'admin') {
    baseOptions.push(
      { text: "👥 Customer Management", callback_data: "action:customer_management" },
      { text: "📈 Sales Reports", callback_data: "action:sales_reports" }
    );
  }
  
  return baseOptions;
}

/**
 * Get Service Department options
 * @param {string} role - User role
 * @returns {Object} Service department options
 */
function getServiceDepartmentOptions(role) {
  const baseOptions = [
    { text: "🔧 Log Service Ticket", callback_data: "action:log_service_ticket" },
    { text: "📱 View Technician Schedule", callback_data: "action:view_schedule" },
    { text: "📊 Service Performance", callback_data: "action:service_performance" }
  ];
  
  // Add admin options for managers
  if (role === 'manager' || role === 'admin') {
    baseOptions.push(
      { text: "👷 Technician Management", callback_data: "action:technician_management" },
      { text: "⚙️ Service Settings", callback_data: "action:service_settings" }
    );
  }
  
  return baseOptions;
}

/**
 * Get default options
 * @returns {Object} Default options
 */
function getDefaultOptions() {
  return [
    { text: "📋 View Options", callback_data: "action:view_options" },
    { text: "📊 View Reports", callback_data: "action:view_reports" },
    { text: "⚙️ Settings", callback_data: "action:settings" }
  ];
}

/**
 * Check if user has permission to perform an action
 * @param {string} userId - Telegram user ID
 * @param {string} action - Action to check
 * @returns {boolean} True if user has permission
 */
async function checkUserPermission(userId, action) {
  try {
    // Get user profile
    const userDoc = await firestore.collection('user_profiles').doc(userId.toString()).get();
    const userProfile = userDoc.data();
    
    if (!userProfile) {
      return false;
    }
    
    // Check if action is allowed for user's department
    return isActionAllowedForDepartment(userProfile.departmentId, action);
  } catch (error) {
    console.error('Error checking user permission:', error);
    return false;
  }
}

/**
 * Check if an action is allowed for a department
 * @param {string} departmentId - Department ID
 * @param {string} action - Action to check
 * @returns {boolean} True if action is allowed
 */
function isActionAllowedForDepartment(departmentId, action) {
  const departmentActions = {
    'finance': [
      'record_payment', 'log_expense', 'view_reports', 
      'bank_management', 'accounting_heads'
    ],
    'sales': [
      'log_delivery', 'record_customer_payment', 'view_customers',
      'customer_management', 'sales_reports'
    ],
    'service': [
      'log_service_ticket', 'view_schedule', 'service_performance',
      'technician_management', 'service_settings'
    ]
  };
  
  // Admins can perform all actions
  if (departmentId === 'admin') {
    return true;
  }
  
  // Check if action is in department's allowed actions
  const allowedActions = departmentActions[departmentId] || [];
  return allowedActions.includes(action);
}

/**
 * Get department-specific welcome message
 * @param {Object} userProfile - User profile
 * @returns {string} Welcome message
 */
function getDepartmentWelcomeMessage(userProfile) {
  const departmentNames = {
    'finance': 'Finance & Store Department',
    'sales': 'Sales Department',
    'service': 'Service Department'
  };
  
  const departmentName = departmentNames[userProfile.departmentId] || 'General Department';
  
  return `👋 Welcome, ${userProfile.firstName}!

*Select an action:*

${departmentName}

🔔 *Notifications*: 0 pending items`;
}

// Export functions
module.exports = {
  getDepartmentOptions,
  checkUserPermission,
  getDepartmentWelcomeMessage
};