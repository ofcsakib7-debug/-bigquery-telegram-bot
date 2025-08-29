/**
 * Department-Specific Commission Views
 * 
 * This module implements the department-specific commission views
 * as specified in Design 12.
 */

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Get sales department commission view for a salesperson
 * @param {string} salespersonId - Salesperson ID
 * @returns {Array} Array of commission records
 */
async function getSalesDepartmentCommissionView(salespersonId) {
  try {
    const query = `
      SELECT
        s.*,
        a.agreement_status,
        t.commission_rate,
        t.tier_description
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.personalized_commission_tracking\` s
      JOIN \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.salesperson_commission_agreements\` a
        ON s.applicable_agreement_id = a.agreement_id
      JOIN \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.salesperson_commission_tiers\` t
        ON s.applicable_tier_id = t.tier_id
      WHERE s.salesperson_id = @salespersonId
      ORDER BY s.commission_calculated_date DESC
      LIMIT 50
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        salespersonId: salespersonId
      },
      maximumBytesBilled: process.env.BIGQUERY_MAX_BYTES_BILLED || '100000000' // 100MB default
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting sales department commission view:', error);
    return [];
  }
}

/**
 * Get HR department view of all commission agreements
 * @returns {Array} Array of commission agreements
 */
async function getHrDepartmentCommissionAgreementsView() {
  try {
    const query = `
      SELECT
        a.salesperson_name,
        a.role_id,
        a.agreement_status,
        t.machine_model_name,
        t.commission_rate,
        t.tier_description
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.salesperson_commission_agreements\` a
      JOIN \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.salesperson_commission_tiers\` t
        ON a.agreement_id = t.agreement_id
      WHERE a.agreement_status = 'ACTIVE'
      ORDER BY a.salesperson_name, t.machine_model_name
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
    console.error('Error getting HR department commission agreements view:', error);
    return [];
  }
}

/**
 * Get finance department view of commission payouts
 * @param {string} date - Date for which to get payouts (YYYY-MM-DD)
 * @returns {Array} Array of commission payout records
 */
async function getFinanceDepartmentCommissionPayoutsView(date = null) {
  try {
    // Use today's date if none provided
    const payoutDate = date || new Date().toISOString().split('T')[0];
    
    const query = `
      SELECT
        salesperson_id,
        salesperson_name,
        SUM(commission_amount_bdt) as total_commission,
        SUM(marketing_incentive_bdt) as total_incentives,
        SUM(commission_amount_bdt) + SUM(marketing_incentive_bdt) as total_payout
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.personalized_commission_tracking\`
      WHERE DATE(commission_paid_date) = @payoutDate
      GROUP BY salesperson_id, salesperson_name
      ORDER BY total_payout DESC
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        payoutDate: payoutDate
      },
      maximumBytesBilled: process.env.BIGQUERY_MAX_BYTES_BILLED || '100000000' // 100MB default
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting finance department commission payouts view:', error);
    return [];
  }
}

/**
 * Calculate personalized commission for a salesperson
 * @param {string} salespersonId - Salesperson ID
 * @param {string} machineModelId - Machine model ID
 * @param {string} machineModelName - Machine model name
 * @param {number} salePriceBdt - Sale price in BDT
 * @returns {Object} Commission calculation result
 */
async function calculatePersonalizedCommissionForSalesperson(
  salespersonId,
  machineModelId,
  machineModelName,
  salePriceBdt
) {
  try {
    // 1. Get active commission agreement for this salesperson
    const agreementQuery = `
      SELECT agreement_id
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.salesperson_commission_agreements\`
      WHERE 
        salesperson_id = @salespersonId
        AND CURRENT_DATE() BETWEEN effective_from AND COALESCE(effective_to, CURRENT_DATE())
        AND agreement_status = 'ACTIVE'
      ORDER BY effective_from DESC
      LIMIT 1
    `;
    
    const agreementOptions = {
      query: agreementQuery,
      location: 'US',
      params: {
        salespersonId: salespersonId
      }
    };
    
    const [agreementJob] = await bigquery.createQueryJob(agreementOptions);
    const [agreementRows] = await agreementJob.getQueryResults();
    
    if (agreementRows.length === 0) {
      return {
        commission_rate: 0.0,
        commission_amount: 0.0,
        error: 'No active commission agreement found'
      };
    }
    
    const agreementId = agreementRows[0].agreement_id;
    
    // 2. Get applicable tier for this machine model and sale price
    const tierQuery = `
      SELECT commission_rate, tier_description
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.salesperson_commission_tiers\`
      WHERE 
        agreement_id = @agreementId
        AND machine_model_id = @machineModelId
        AND (@salePriceBdt >= minimum_sales_value_bdt OR minimum_sales_value_bdt IS NULL)
      ORDER BY minimum_sales_value_bdt DESC
      LIMIT 1
    `;
    
    const tierOptions = {
      query: tierQuery,
      location: 'US',
      params: {
        agreementId: agreementId,
        machineModelId: machineModelId,
        salePriceBdt: salePriceBdt
      }
    };
    
    const [tierJob] = await bigquery.createQueryJob(tierOptions);
    const [tierRows] = await tierJob.getQueryResults();
    
    if (tierRows.length === 0) {
      return {
        commission_rate: 0.0,
        commission_amount: 0.0,
        error: 'No applicable commission tier found'
      };
    }
    
    const tier = tierRows[0];
    
    // 3. Calculate commission amount
    const commissionAmount = salePriceBdt * (tier.commission_rate / 100);
    
    return {
      agreement_id: agreementId,
      commission_rate: tier.commission_rate,
      commission_amount: commissionAmount,
      tier_description: tier.tier_description
    };
  } catch (error) {
    console.error('Error calculating personalized commission for salesperson:', error);
    return {
      commission_rate: 0.0,
      commission_amount: 0.0,
      error: 'Error calculating commission'
    };
  }
}

/**
 * Get sales department commission management menu
 * @returns {Object} Menu structure
 */
function getSalesDepartmentCommissionMenu() {
  return {
    menu_id: 'MENU-SALES-COMMISSION-ABC',
    department_id: 'SALES',
    menu_type: 'COMMISSION',
    menu_name: 'Commission Management',
    menu_structure: {
      main_menu: {
        title: 'Commission Management',
        buttons: [
          { text: '?? View My Commission', callback_data: 'menu:commission:view' },
          { text: '?? View Commission Rates', callback_data: 'menu:commission:rates' },
          { text: '?? Project Earnings', callback_data: 'menu:commission:project' }
        ]
      },
      commission_menu: {
        title: 'My Commission Details',
        buttons: [
          { text: '?? Commission History', callback_data: 'action:commission:history' },
          { text: '?? Earnings Projection', callback_data: 'action:commission:projection' },
          { text: '?? Export Report', callback_data: 'action:commission:export' }
        ]
      },
      rates_menu: {
        title: 'My Commission Rates',
        buttons: [
          { text: '?? Sewing Machines', callback_data: 'action:rates:sewing' },
          { text: '?? Spare Parts', callback_data: 'action:rates:spare_parts' },
          { text: '?? Service Tools', callback_data: 'action:rates:service_tools' }
        ]
      }
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
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
      // Add section title if it exists (as a message, not a button)
      
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

/**
 * Get department-specific commission rates
 * @param {string} salespersonId - Salesperson ID
 * @param {string} machineType - Machine type filter (optional)
 * @returns {Array} Array of commission rates
 */
async function getDepartmentCommissionRates(salespersonId, machineType = null) {
  try {
    let query = `
      SELECT 
        t.machine_model_id,
        t.machine_model_name,
        t.commission_rate,
        t.minimum_sales_value_bdt,
        t.tier_description,
        a.role_id
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.salesperson_commission_tiers\` t
      JOIN \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.salesperson_commission_agreements\` a
        ON t.agreement_id = a.agreement_id
      WHERE a.salesperson_id = @salespersonId
        AND a.agreement_status = 'ACTIVE'
        AND CURRENT_DATE() BETWEEN a.effective_from AND COALESCE(a.effective_to, CURRENT_DATE())
    `;
    
    const params = {
      salespersonId: salespersonId
    };
    
    // Add machine type filter if provided
    if (machineType) {
      query += ' AND t.machine_model_name LIKE @machineType';
      params.machineType = `%${machineType}%`;
    }
    
    query += ' ORDER BY t.machine_model_name';
    
    const options = {
      query: query,
      location: 'US',
      params: params,
      maximumBytesBilled: process.env.BIGQUERY_MAX_BYTES_BILLED || '100000000' // 100MB default
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting department commission rates:', error);
    return [];
  }
}

/**
 * Get commission projection for a salesperson
 * @param {string} salespersonId - Salesperson ID
 * @param {number} targetSales - Target monthly sales amount
 * @returns {Object} Commission projection
 */
async function getCommissionProjection(salespersonId, targetSales) {
  try {
    // Get current month's sales to date
    const currentMonthQuery = `
      SELECT 
        SUM(sale_price_bdt) as current_month_sales,
        SUM(commission_amount_bdt) as current_month_commission
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${
      process.env.BIGQUERY_DATASET_ID || 'dataset'
    }.personalized_commission_tracking\`
      WHERE salesperson_id = @salespersonId
        AND DATE(commission_calculated_date) >= DATE_TRUNC(CURRENT_DATE(), MONTH)
    `;
    
    const currentMonthOptions = {
      query: currentMonthQuery,
      location: 'US',
      params: {
        salespersonId: salespersonId
      }
    };
    
    const [currentMonthJob] = await bigquery.createQueryJob(currentMonthOptions);
    const [currentMonthRows] = await currentMonthJob.getQueryResults();
    
    const currentMonthData = currentMonthRows.length > 0 ? currentMonthRows[0] : {
      current_month_sales: 0,
      current_month_commission: 0
    };
    
    // Calculate projected commission based on historical average rate
    let projectedCommission = 0;
    if (currentMonthData.current_month_sales > 0) {
      const avgCommissionRate = currentMonthData.current_month_commission / currentMonthData.current_month_sales;
      projectedCommission = targetSales * avgCommissionRate;
    }
    
    // Get target achievement percentage
    const targetAchievement = currentMonthData.current_month_sales / targetSales * 100;
    
    return {
      salesperson_id: salespersonId,
      current_month_sales: currentMonthData.current_month_sales,
      current_month_commission: currentMonthData.current_month_commission,
      target_monthly_sales: targetSales,
      target_achievement_percentage: targetAchievement,
      projected_monthly_commission: projectedCommission,
      additional_sales_needed: Math.max(0, targetSales - currentMonthData.current_month_sales)
    };
  } catch (error) {
    console.error('Error getting commission projection:', error);
    return {
      error: 'Error calculating projection'
    };
  }
}

// Export functions
module.exports = {
  getSalesDepartmentCommissionView,
  getHrDepartmentCommissionAgreementsView,
  getFinanceDepartmentCommissionPayoutsView,
  calculatePersonalizedCommissionForSalesperson,
  getSalesDepartmentCommissionMenu,
  formatMenuAsInlineKeyboard,
  getDepartmentCommissionRates,
  getCommissionProjection
};