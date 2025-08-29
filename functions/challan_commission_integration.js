/**
 * Challan-Commission Integration System
 * 
 * This module implements the challan-commission integration functionality
 * as specified in Design 12.
 */

const { BigQuery } = require('@google-cloud/bigquery');
const { calculatePersonalizedCommission } = require('./personalized_commissions');
const { getMarketingIncentivesByChallan } = require('./marketing_incentives');
const { getTransportationCostsByChallan } = require('./transportation_costs');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Create or update challan-commission integration record
 * @param {Object} integrationData - Integration data
 * @returns {string} Integration ID
 */
async function createOrUpdateChallanCommissionIntegration(integrationData) {
  try {
    // Generate integration ID
    const integrationId = `INTEG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Calculate company transport covered amount if not provided
    let companyTransportCoveredBdt = integrationData.companyTransportCoveredBdt;
    if (companyTransportCoveredBdt === undefined && integrationData.transportationCostBdt !== undefined && integrationData.customerTransportPaymentBdt !== undefined) {
      companyTransportCoveredBdt = integrationData.transportationCostBdt - (integrationData.customerTransportPaymentBdt || 0);
    }
    
    // Set values
    const integration = {
      integration_id: integrationId,
      challan_number: integrationData.challanNumber,
      machine_model_id: integrationData.machineModelId,
      machine_model_name: integrationData.machineModelName,
      salesperson_id: integrationData.salespersonId,
      salesperson_name: integrationData.salespersonName,
      salesperson_agreement_id: integrationData.salespersonAgreementId,
      salesperson_commission_rate: integrationData.salespersonCommissionRate,
      salesperson_commission_bdt: integrationData.salespersonCommissionBdt,
      marketing_staff_id: integrationData.marketingStaffId || null,
      marketing_staff_name: integrationData.marketingStaffName || null,
      marketing_incentive_bdt: integrationData.marketingIncentiveBdt || null,
      total_commission_bdt: integrationData.totalCommissionBdt,
      transportation_cost_bdt: integrationData.transportationCostBdt,
      customer_transport_payment_bdt: integrationData.customerTransportPaymentBdt || null,
      company_transport_covered_bdt: companyTransportCoveredBdt,
      commission_due_date: integrationData.commissionDueDate,
      last_updated: new Date().toISOString()
    };
    
    // Insert or update integration record (append-only as per requirements)
    const query = `
      INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.challan_commission_integration\`
      (integration_id, challan_number, machine_model_id, machine_model_name, salesperson_id, salesperson_name,
       salesperson_agreement_id, salesperson_commission_rate, salesperson_commission_bdt, marketing_staff_id,
       marketing_staff_name, marketing_incentive_bdt, total_commission_bdt, transportation_cost_bdt,
       customer_transport_payment_bdt, company_transport_covered_bdt, commission_due_date, last_updated)
      VALUES
      (@integration_id, @challan_number, @machine_model_id, @machine_model_name, @salesperson_id, @salesperson_name,
       @salesperson_agreement_id, @salesperson_commission_rate, @salesperson_commission_bdt, @marketing_staff_id,
       @marketing_staff_name, @marketing_incentive_bdt, @total_commission_bdt, @transportation_cost_bdt,
       @customer_transport_payment_bdt, @company_transport_covered_bdt, @commission_due_date, @last_updated)
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: integration
    };
    
    await bigquery.createQueryJob(options);
    
    return integrationId;
  } catch (error) {
    console.error('Error creating or updating challan-commission integration:', error);
    throw error;
  }
}

/**
 * Get challan-commission integration records by challan number
 * @param {string} challanNumber - Challan number
 * @returns {Array} Array of integration records
 */
async function getChallanCommissionIntegrationByChallan(challanNumber) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.challan_commission_integration\`
      WHERE challan_number = @challanNumber
      ORDER BY last_updated DESC
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        challanNumber: challanNumber
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting challan-commission integration by challan:', error);
    return [];
  }
}

/**
 * Get latest challan-commission integration record by challan number
 * @param {string} challanNumber - Challan number
 * @returns {Object|null} Latest integration record or null if not found
 */
async function getLatestChallanCommissionIntegration(challanNumber) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.challan_commission_integration\`
      WHERE challan_number = @challanNumber
      ORDER BY last_updated DESC
      LIMIT 1
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        challanNumber: challanNumber
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting latest challan-commission integration:', error);
    return null;
  }
}

/**
 * Generate comprehensive commission report for a challan
 * @param {string} challanNumber - Challan number
 * @param {Object} saleDetails - Sale details
 * @returns {Object} Comprehensive commission report
 */
async function generateCommissionReportForChallan(challanNumber, saleDetails) {
  try {
    // 1. Calculate personalized commission
    const commissionCalculation = await calculatePersonalizedCommission(
      saleDetails.salespersonId,
      saleDetails.machineModelId,
      saleDetails.machineModelName,
      saleDetails.salePriceBdt
    );
    
    // 2. Get marketing incentives for this challan
    const marketingIncentives = await getMarketingIncentivesByChallan(challanNumber);
    const totalMarketingIncentive = marketingIncentives.reduce((sum, incentive) => sum + (incentive.incentive_amount_bdt || 0), 0);
    
    // 3. Get transportation costs for this challan
    const transportationCosts = await getTransportationCostsByChallan(challanNumber);
    const totalTransportationCost = transportationCosts.reduce((sum, cost) => sum + (cost.total_cost_bdt || 0), 0);
    const totalCustomerTransportPayment = transportationCosts.reduce((sum, cost) => sum + (cost.customer_payment_bdt || 0), 0);
    const totalCompanyTransportCovered = transportationCosts.reduce((sum, cost) => sum + (cost.company_covered_bdt || 0), 0);
    
    // 4. Calculate total commission
    const totalCommission = commissionCalculation.commission_amount + totalMarketingIncentive;
    
    // 5. Create integration record
    const integrationData = {
      challanNumber: challanNumber,
      machineModelId: saleDetails.machineModelId,
      machineModelName: saleDetails.machineModelName,
      salespersonId: saleDetails.salespersonId,
      salespersonName: saleDetails.salespersonName,
      salespersonAgreementId: commissionCalculation.agreement_id,
      salespersonCommissionRate: commissionCalculation.commission_rate,
      salespersonCommissionBdt: commissionCalculation.commission_amount,
      marketingStaffId: saleDetails.marketingStaffId || null,
      marketingStaffName: saleDetails.marketingStaffName || null,
      marketingIncentiveBdt: totalMarketingIncentive,
      totalCommissionBdt: totalCommission,
      transportationCostBdt: totalTransportationCost,
      customerTransportPaymentBdt: totalCustomerTransportPayment,
      companyTransportCoveredBdt: totalCompanyTransportCovered,
      commissionDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      lastUpdated: new Date().toISOString()
    };
    
    // 6. Save integration record
    await createOrUpdateChallanCommissionIntegration(integrationData);
    
    // 7. Return comprehensive report
    return {
      challan_number: challanNumber,
      salesperson: {
        id: saleDetails.salespersonId,
        name: saleDetails.salespersonName,
        agreement_id: commissionCalculation.agreement_id
      },
      commission: {
        rate: commissionCalculation.commission_rate,
        amount_bdt: commissionCalculation.commission_amount,
        tier_description: commissionCalculation.tier_description
      },
      marketing: {
        incentives: marketingIncentives,
        total_incentive_bdt: totalMarketingIncentive
      },
      transportation: {
        costs: transportationCosts,
        total_cost_bdt: totalTransportationCost,
        customer_payment_bdt: totalCustomerTransportPayment,
        company_covered_bdt: totalCompanyTransportCovered
      },
      totals: {
        commission_bdt: totalCommission,
        due_date: integrationData.commissionDueDate
      },
      last_updated: integrationData.lastUpdated
    };
  } catch (error) {
    console.error('Error generating commission report for challan:', error);
    throw error;
  }
}

/**
 * Get commission summary by salesperson
 * @param {string} salespersonId - Salesperson ID
 * @param {Object} filters - Additional filters
 * @returns {Object} Commission summary
 */
async function getCommissionSummaryBySalesperson(salespersonId, filters = {}) {
  try {
    let query = `
      SELECT 
        salesperson_id,
        salesperson_name,
        COUNT(*) as total_challans,
        SUM(salesperson_commission_bdt) as total_salesperson_commission_bdt,
        SUM(marketing_incentive_bdt) as total_marketing_incentive_bdt,
        SUM(total_commission_bdt) as grand_total_commission_bdt,
        SUM(transportation_cost_bdt) as total_transportation_cost_bdt,
        SUM(customer_transport_payment_bdt) as total_customer_transport_payment_bdt,
        SUM(company_transport_covered_bdt) as total_company_transport_covered_bdt,
        AVG(salesperson_commission_rate) as average_commission_rate,
        MIN(last_updated) as first_record_date,
        MAX(last_updated) as last_record_date
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.challan_commission_integration\`
      WHERE salesperson_id = @salespersonId
    `;
    
    const params = {
      salespersonId: salespersonId
    };
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND DATE(last_updated) >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND DATE(last_updated) <= @endDate';
      params.endDate = filters.endDate;
    }
    
    query += ' GROUP BY salesperson_id, salesperson_name ORDER BY last_record_date DESC';
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting commission summary by salesperson:', error);
    return null;
  }
}

/**
 * Get commission details by date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of commission integration records
 */
async function getCommissionDetailsByDateRange(startDate, endDate, filters = {}) {
  try {
    let query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.challan_commission_integration\`
      WHERE DATE(last_updated) >= @startDate AND DATE(last_updated) <= @endDate
    `;
    
    const params = {
      startDate: startDate,
      endDate: endDate
    };
    
    // Add salesperson ID filter if provided
    if (filters.salespersonId) {
      query += ' AND salesperson_id = @salespersonId';
      params.salespersonId = filters.salespersonId;
    }
    
    // Add challan number filter if provided
    if (filters.challanNumber) {
      query += ' AND challan_number = @challanNumber';
      params.challanNumber = filters.challanNumber;
    }
    
    query += ' ORDER BY last_updated DESC';
    
    // Add limit if provided
    if (filters.limit) {
      query += ' LIMIT @limit';
      params.limit = filters.limit;
    }
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting commission details by date range:', error);
    return [];
  }
}

/**
 * Get top performing salespeople by commission
 * @param {number} limit - Number of salespeople to return
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of top performing salespeople
 */
async function getTopPerformingSalespeople(limit = 10, filters = {}) {
  try {
    let query = `
      SELECT 
        salesperson_id,
        salesperson_name,
        COUNT(*) as total_challans,
        SUM(salesperson_commission_bdt) as total_salesperson_commission_bdt,
        SUM(marketing_incentive_bdt) as total_marketing_incentive_bdt,
        SUM(total_commission_bdt) as grand_total_commission_bdt,
        AVG(salesperson_commission_rate) as average_commission_rate
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.challan_commission_integration\`
      WHERE 1=1
    `;
    
    const params = {};
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND DATE(last_updated) >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND DATE(last_updated) <= @endDate';
      params.endDate = filters.endDate;
    }
    
    query += `
      GROUP BY salesperson_id, salesperson_name
      ORDER BY total_salesperson_commission_bdt DESC
      LIMIT @limit
    `;
    
    params.limit = limit;
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting top performing salespeople:', error);
    return [];
  }
}

/**
 * Get commission statistics
 * @param {Object} filters - Additional filters
 * @returns {Object|null} Commission statistics or null if not found
 */
async function getCommissionStatistics(filters = {}) {
  try {
    let query = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT salesperson_id) as unique_salespeople,
        COUNT(DISTINCT challan_number) as unique_challans,
        SUM(salesperson_commission_bdt) as total_salesperson_commission_bdt,
        SUM(marketing_incentive_bdt) as total_marketing_incentive_bdt,
        SUM(total_commission_bdt) as total_commission_bdt,
        SUM(transportation_cost_bdt) as total_transportation_cost_bdt,
        SUM(customer_transport_payment_bdt) as total_customer_transport_payment_bdt,
        SUM(company_transport_covered_bdt) as total_company_transport_covered_bdt,
        AVG(salesperson_commission_rate) as average_commission_rate,
        AVG(total_commission_bdt) as average_total_commission_bdt,
        MIN(last_updated) as earliest_record,
        MAX(last_updated) as latest_record
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.challan_commission_integration\`
      WHERE 1=1
    `;
    
    const params = {};
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND DATE(last_updated) >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND DATE(last_updated) <= @endDate';
      params.endDate = filters.endDate;
    }
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting commission statistics:', error);
    return null;
  }
}

// Export functions
module.exports = {
  createOrUpdateChallanCommissionIntegration,
  getChallanCommissionIntegrationByChallan,
  getLatestChallanCommissionIntegration,
  generateCommissionReportForChallan,
  getCommissionSummaryBySalesperson,
  getCommissionDetailsByDateRange,
  getTopPerformingSalespeople,
  getCommissionStatistics
};