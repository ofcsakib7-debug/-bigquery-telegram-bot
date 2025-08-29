/**
 * Department-Specific Menu System
 * 
 * This module implements the department-specific menu system
 * as specified in Design 9.
 */

const { BigQuery } = require('@google-cloud/bigquery');
const { Firestore } = require('@google-cloud/firestore');
const { getUserRole, getUserPermissions, canEditRecord } = require('./user_permissions');

// Initialize clients
const bigquery = new BigQuery();
const firestore = new Firestore();

/**
 * Generate department-specific menu for a user
 * @param {string} userId - Telegram user ID
 * @param {string} departmentId - Department ID
 * @returns {Object} Menu structure
 */
async function generateDepartmentMenu(userId, departmentId) {
  try {
    // Get user role
    const userRole = await getUserRole(userId);
    if (!userRole) {
      return getDefaultMenu();
    }

    // Get menu structure from BigQuery
    const menuStructure = await getMenuStructure(departmentId, userRole);
    if (!menuStructure) {
      return getDefaultMenu();
    }

    // Parse menu structure
    const parsedMenu = typeof menuStructure === 'string' ? JSON.parse(menuStructure) : menuStructure;

    // Customize menu based on user permissions
    const customizedMenu = await customizeMenuForUser(parsedMenu, userId, departmentId, userRole);

    return customizedMenu;
  } catch (error) {
    console.error('Error generating department menu:', error);
    return getDefaultMenu();
  }
}

/**
 * Get menu structure from BigQuery
 * @param {string} departmentId - Department ID
 * @param {string} userRole - User role
 * @returns {Object|string|null} Menu structure or null if not found
 */
async function getMenuStructure(departmentId, userRole) {
  try {
    const query = `
      SELECT menu_structure
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.department_menus\`
      WHERE department_id = @departmentId AND role_id = @userRole
      LIMIT 1
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

    return rows.length > 0 ? rows[0].menu_structure : null;
  } catch (error) {
    console.error('Error getting menu structure:', error);
    return null;
  }
}

/**
 * Customize menu for user based on permissions and time limits
 * @param {Object} menu - Menu structure
 * @param {string} userId - Telegram user ID
 * @param {string} departmentId - Department ID
 * @param {string} userRole - User role
 * @returns {Object} Customized menu
 */
async function customizeMenuForUser(menu, userId, departmentId, userRole) {
  try {
    // Get user permissions
    const permissions = await getUserPermissions(userId, departmentId);
    
    // Create customized menu structure
    const customizedMenu = {
      inline_keyboard: []
    };

    // Process each menu section
    for (const [sectionName, section] of Object.entries(menu)) {
      // Add section title if it exists
      if (section.title) {
        // We don't add titles as buttons, but we could add them as messages
      }

      // Process buttons in the section
      if (section.buttons && Array.isArray(section.buttons)) {
        const sectionButtons = [];
        
        for (const button of section.buttons) {
          // Check if user has permission for this action
          const actionAllowed = await isActionAllowedForUser(button, userId, departmentId, permissions);
          
          if (actionAllowed) {
            sectionButtons.push(button);
          }
        }
        
        // Add buttons to menu (max 2 per row as per Telegram inline keyboard format)
        for (let i = 0; i < sectionButtons.length; i += 2) {
          const row = [];
          row.push(sectionButtons[i]);
          
          if (i + 1 < sectionButtons.length) {
            row.push(sectionButtons[i + 1]);
          }
          
          customizedMenu.inline_keyboard.push(row);
        }
      }
    }

    // Add back to main menu button
    customizedMenu.inline_keyboard.push([
      {
        text: "⬅️ Back to Main Menu",
        callback_data: "menu:main"
      }
    ]);

    // Add snooze options
    customizedMenu.inline_keyboard.push([
      {
        text: "☕ Finish coffee first (30 min)",
        callback_data: "snooze:30m"
      }
    ]);

    customizedMenu.inline_keyboard.push([
      {
        text: "EndInit of work (5pm)",
        callback_data: "snooze:work_end"
      }
    ]);

    return customizedMenu;
  } catch (error) {
    console.error('Error customizing menu for user:', error);
    return getDefaultMenu();
  }
}

/**
 * Check if action is allowed for user
 * @param {Object} button - Button definition
 * @param {string} userId - Telegram user ID
 * @param {string} departmentId - Department ID
 * @param {Object} permissions - User permissions
 * @returns {boolean} True if action is allowed
 */
async function isActionAllowedForUser(button, userId, departmentId, permissions) {
  try {
    // Extract action from callback_data
    const callbackData = button.callback_data;
    if (!callbackData) {
      return false;
    }

    // Parse callback data to determine action type
    const parts = callbackData.split(':');
    const actionType = parts[0];
    const resourceType = parts[1];
    const action = parts[2];

    // Handle different action types
    switch (actionType) {
      case 'menu':
        // Menu navigation is always allowed
        return true;
      
      case 'action':
        // Check specific action permissions
        switch (action) {
          case 'add':
            return permissions && permissions.can_add;
          
          case 'edit':
            // For edit actions, we need to check time limits
            // Since we don't have a specific record, we'll just check general permission
            return permissions && permissions.can_edit;
          
          case 'delete':
            return permissions && permissions.can_delete;
          
          case 'request_edit':
            // Request edit is allowed when regular edit is not
            return permissions && permissions.can_edit && permissions.requires_approval_for_edit;
          
          default:
            // For other actions, check read permission
            return permissions && permissions.can_read;
        }
      
      default:
        // For other action types, check read permission
        return permissions && permissions.can_read;
    }
  } catch (error) {
    console.error('Error checking if action is allowed for user:', error);
    return false;
  }
}

/**
 * Get default menu
 * @returns {Object} Default menu structure
 */
function getDefaultMenu() {
  return {
    inline_keyboard: [
      [
        {
          text: "📋 View Options",
          callback_data: "action:view_options"
        }
      ],
      [
        {
          text: "📊 View Reports",
          callback_data: "action:view_reports"
        }
      ],
      [
        {
          text: "⚙️ Settings",
          callback_data: "action:settings"
        }
      ],
      [
        {
          text: "⬅️ Back to Main Menu",
          callback_data: "menu:main"
        }
      ]
    ]
  };
}

/**
 * Get department-specific menu examples
 * @returns {Array} Array of example menu structures
 */
function getDepartmentMenuExamples() {
  return [
    // INVENTORY: Staff menu
    {
      menu_id: 'MENU-INV-STAFF-ABC',
      department_id: 'INVENTORY',
      role_id: 'STAFF',
      menu_name: 'Inventory Management',
      menu_structure: {
        "main_menu": {
          "title": "Inventory Management",
          "buttons": [
            {
              "text": "1📦 View Stock Levels",
              "callback_data": "menu:inventory:stock"
            },
            {
              "text": "2📥 Receive New Items",
              "callback_data": "menu:inventory:receive"
            },
            {
              "text": "3🔄 Transfer Between Branches",
              "callback_data": "menu:inventory:transfer"
            }
          ]
        },
        "receive_menu": {
          "title": "Receive New Items",
          "buttons": [
            {
              "text": "➕ Add New Item",
              "callback_data": "action:inventory:add"
            },
            {
              "text": "✏️ Edit Recent Item",
              "callback_data": "action:inventory:edit"
            },
            {
              "text": "📝 Request Edit (Expired)",
              "callback_data": "action:inventory:request_edit"
            }
          ]
        }
      },
      can_add: true,
      can_edit: true,
      can_delete: false,
      time_limit_hours: 2,
      requires_approval_for_edit: true,
      requires_approval_for_delete: true
    },
    
    // FINANCE: Staff menu
    {
      menu_id: 'MENU-FIN-STAFF-DEF',
      department_id: 'FINANCE',
      role_id: 'STAFF',
      menu_name: 'Finance Management',
      menu_structure: {
        "main_menu": {
          "title": "Finance Management",
          "buttons": [
            {
              "text": "1💰 View Transactions",
              "callback_data": "menu:finance:transactions"
            },
            {
              "text": "2💳 Record Payment",
              "callback_data": "menu:finance:payment"
            },
            {
              "text": "3📊 Expense Report",
              "callback_data": "menu:finance:expense"
            }
          ]
        },
        "payment_menu": {
          "title": "Record Payment",
          "buttons": [
            {
              "text": "➕ Add New Payment",
              "callback_data": "action:finance:add"
            },
            {
              "text": "✏️ Edit Recent Payment",
              "callback_data": "action:finance:edit"
            },
            {
              "text": "📝 Request Edit (Expired)",
              "callback_data": "action:finance:request_edit"
            }
          ]
        }
      },
      can_add: true,
      can_edit: true,
      can_delete: false,
      time_limit_hours: 2,
      requires_approval_for_edit: true,
      requires_approval_for_delete: true
    }
  ];
}

// Export functions
module.exports = {
  generateDepartmentMenu,
  getMenuStructure,
  customizeMenuForUser,
  isActionAllowedForUser,
  getDefaultMenu,
  getDepartmentMenuExamples
};