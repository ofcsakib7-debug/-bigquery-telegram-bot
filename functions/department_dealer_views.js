/**
 * Department-Specific Dealer Views
 * 
 * This module implements the department-specific dealer views
 * as specified in Design 11.
 */

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Get high-value dealer relationships for Sales department
 * @returns {Array} Array of high-value dealers
 */
async function getSalesHighValueDealers() {
  try {
    const query = `
      SELECT
        d.*,
        c.credit_utilization_percent,
        c.performance_score
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_profiles\` d
      JOIN \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_payment_cache\` c
        ON d.dealer_id = c.dealer_id
      WHERE d.status = 'ACTIVE'
      ORDER BY c.performance_score DESC
      LIMIT 10
    `;
    
    const options = {
      query: query,
      location: 'US',
      maximumBytesBilled: process.env.BIGQUERY_MAX_BYTES_BILLED || '100000000' // 100MB default
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting sales high-value dealers:', error);
    return [];
  }
}

/**
 * Get dealers with high credit utilization for Inventory department
 * @param {number} thresholdPercent - Credit utilization threshold percentage
 * @returns {Array} Array of dealers with high credit utilization
 */
async function getInventoryHighCreditUtilizationDealers(thresholdPercent = 80) {
  try {
    const query = `
      SELECT
        dealer_id,
        dealer_name,
        credit_limit_bdt,
        current_outstanding_bdt,
        credit_utilization_percent
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_payment_cache\`
      WHERE credit_utilization_percent > @thresholdPercent
      ORDER BY credit_utilization_percent DESC
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        thresholdPercent: thresholdPercent
      },
      maximumBytesBilled: process.env.BIGQUERY_MAX_BYTES_BILLED || '100000000' // 100MB default
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting inventory high credit utilization dealers:', error);
    return [];
  }
}

/**
 * Check dealer credit for Sales department
 * @param {string} dealerId - Dealer ID
 * @param {number} challanValue - Challan value
 * @returns {Object} Credit check result
 */
async function checkDealerCreditForSales(dealerId, challanValue) {
  try {
    // Get dealer credit info
    const query = `
      SELECT 
        credit_limit_bdt,
        current_outstanding_bdt,
        credit_utilization_percent
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_payment_cache\`
      WHERE dealer_id = @dealerId
      LIMIT 1
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        dealerId: dealerId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    // Calculate available credit
    if (rows.length === 0) {
      return {
        sufficient_credit: false,
        error: 'Dealer not found'
      };
    }
    
    const creditInfo = rows[0];
    const availableCredit = creditInfo.credit_limit_bdt - creditInfo.current_outstanding_bdt;
    
    // Check if sufficient credit
    if (availableCredit < challanValue) {
      return {
        sufficient_credit: false,
        available_credit: availableCredit,
        challan_value: challanValue,
        shortfall: challanValue - availableCredit
      };
    }
    
    return {
      sufficient_credit: true
    };
  } catch (error) {
    console.error('Error checking dealer credit for sales:', error);
    return {
      sufficient_credit: false,
      error: 'Error checking credit'
    };
  }
}

/**
 * Validate stock availability for Inventory department
 * @param {string} transferId - Transfer ID
 * @returns {Array} Array of items with insufficient stock
 */
async function validateStockAvailabilityForInventory(transferId) {
  try {
    const query = `
      SELECT
        m.machine_model_id,
        m.machine_model_name,
        i.quantity AS requested,
        s.current_stock
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_challan_items\` i
      JOIN \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.machine_models\` m
        ON i.machine_model_id = m.machine_model_id
      LEFT JOIN \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.inventory_stock_cache\` s
        ON i.machine_model_id = s.machine_model_id
      WHERE i.transfer_id = @transferId
        AND (s.current_stock < i.quantity OR s.current_stock IS NULL)
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        transferId: transferId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error validating stock availability for inventory:', error);
    return [];
  }
}

/**
 * Get Sales department dealer management menu
 * @returns {Object} Menu structure
 */
function getSalesDealerManagementMenu() {
  return {
    menu_id: 'MENU-SALES-DEALER-ABC',
    department_id: 'SALES',
    menu_type: 'DEALER',
    menu_name: 'Dealer Management',
    menu_structure: {
      main_menu: {
        title: 'Dealer Management',
        buttons: [
          { text: '1?? View Dealer List', callback_data: 'menu:dealer:list' },
          { text: '2?? Record New Challan', callback_data: 'menu:dealer:challan' },
          { text: '3?? Record Payment', callback_data: 'menu:dealer:payment' }
        ]
      },
      challan_menu: {
        title: 'New Dealer Challan',
        buttons: [
          { text: '? Add Machine Model', callback_data: 'action:challan:add_model' },
          { text: '? Add Spare Parts', callback_data: 'action:challan:add_parts' },
          { text: '? Finalize Challan', callback_data: 'action:challan:finalize' }
        ]
      }
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Get Inventory department stock transfer menu
 * @returns {Object} Menu structure
 */
function getInventoryStockTransferMenu() {
  return {
    menu_id: 'MENU-INVENTORY-TRANSFER-DEF',
    department_id: 'INVENTORY',
    menu_type: 'TRANSFER',
    menu_name: 'Stock Transfer',
    menu_structure: {
      main_menu: {
        title: 'Stock Transfer',
        buttons: [
          { text: '1?? Transfer to Dealer', callback_data: 'menu:transfer:dealer' },
          { text: '2?? Transfer Between Branches', callback_data: 'menu:transfer:branches' },
          { text: '3?? View Transfer History', callback_data: 'menu:transfer:history' }
        ]
      },
      transfer_menu: {
        title: 'Transfer to Dealer',
        buttons: [
          { text: '?? Select Dealer', callback_data: 'action:transfer:select_dealer' },
          { text: '?? Select Items', callback_data: 'action:transfer:select_items' },
          { text: '?? Schedule Transfer', callback_data: 'action:transfer:schedule' }
        ]
      }
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Get department-specific menu for a user
 * @param {string} departmentId - Department ID
 * @param {string} menuType - Menu type
 * @returns {Object|null} Menu structure or null if not found
 */
async function getDepartmentSpecificMenu(departmentId, menuType) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.department_menus\`
      WHERE department_id = @departmentId AND menu_type = @menuType
      LIMIT 1
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        departmentId: departmentId,
        menuType: menuType
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    if (rows.length > 0) {
      // Parse menu structure if it's stored as JSON
      const menu = rows[0];
      if (typeof menu.menu_structure === 'string') {
        menu.menu_structure = JSON.parse(menu.menu_structure);
      }
      return menu;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting department-specific menu:', error);
    return null;
  }
}

/**
 * Format menu as Telegram inline keyboard
 * @param {Object} menuStructure - Menu structure
 * @returns {Object} Inline keyboard structure
 */
function formatMenuAsInlineKeyboard(menuStructure) {
  try {
    const keyboard = {
      inline_keyboard: []
    };
    
    // Process each menu section
    for (const [sectionName, section] of Object.entries(menuStructure)) {
      // Add section title if it exists
      if (section.title) {
        // We don't add titles as buttons, but we could add them as messages
      }
      
      // Process buttons in the section
      if (section.buttons && Array.isArray(section.buttons)) {
        // Add buttons to menu (max 2 per row as per Telegram inline keyboard format)
        for (let i = 0; i < section.buttons.length; i += 2) {
          const row = [];
          row.push(section.buttons[i]);
          
          if (i + 1 < section.buttons.length) {
            row.push(section.buttons[i + 1]);
          }
          
          keyboard.inline_keyboard.push(row);
        }
      }
    }
    
    return keyboard;
  } catch (error) {
    console.error('Error formatting menu as inline keyboard:', error);
    // Return a default keyboard
    return {
      inline_keyboard: [
        [{ text: 'Back to Main Menu', callback_data: 'menu:main' }]
      ]
    };
  }
}

// Export functions
module.exports = {
  getSalesHighValueDealers,
  getInventoryHighCreditUtilizationDealers,
  checkDealerCreditForSales,
  validateStockAvailabilityForInventory,
  getSalesDealerManagementMenu,
  getInventoryStockTransferMenu,
  getDepartmentSpecificMenu,
  formatMenuAsInlineKeyboard
};