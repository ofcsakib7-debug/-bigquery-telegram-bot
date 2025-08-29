/**
 * Transportation Cost Tracking System
 * 
 * This module implements the transportation cost tracking functionality
 * as specified in Design 12.
 */

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Record a transportation cost
 * @param {Object} transportData - Transportation cost data
 * @returns {string} Transport ID
 */
async function recordTransportationCost(transportData) {
  try {
    // Generate transport ID
    const transportId = `TRANSPORT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Calculate company covered amount if not provided
    let companyCoveredBdt = transportData.companyCoveredBdt;
    if (companyCoveredBdt === undefined && transportData.totalCostBdt !== undefined && transportData.customerPaymentBdt !== undefined) {
      companyCoveredBdt = transportData.totalCostBdt - (transportData.customerPaymentBdt || 0);
    }
    
    // Set values
    const transport = {
      transport_id: transportId,
      challan_number: transportData.challanNumber,
      vehicle_id: transportData.vehicleId,
      vehicle_type: transportData.vehicleType,
      total_cost_bdt: transportData.totalCostBdt,
      customer_agreed_to_pay: transportData.customerAgreedToPay || false,
      customer_payment_bdt: transportData.customerPaymentBdt || null,
      company_covered_bdt: companyCoveredBdt,
      approval_required: transportData.approvalRequired || false,
      approved_by: transportData.approvedBy || null,
      approved_at: transportData.approvedAt || null,
      approval_notes: transportData.approvalNotes || null,
      created_at: new Date().toISOString()
    };
    
    // Insert transportation cost record
    const query = `
      INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.transportation_costs\`
      (transport_id, challan_number, vehicle_id, vehicle_type, total_cost_bdt, customer_agreed_to_pay,
       customer_payment_bdt, company_covered_bdt, approval_required, approved_by, approved_at,
       approval_notes, created_at)
      VALUES
      (@transport_id, @challan_number, @vehicle_id, @vehicle_type, @total_cost_bdt, @customer_agreed_to_pay,
       @customer_payment_bdt, @company_covered_bdt, @approval_required, @approved_by, @approved_at,
       @approval_notes, @created_at)
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: transport
    };
    
    await bigquery.createQueryJob(options);
    
    return transportId;
  } catch (error) {
    console.error('Error recording transportation cost:', error);
    throw error;
  }
}

/**
 * Get transportation cost by ID
 * @param {string} transportId - Transport ID
 * @returns {Object|null} Transportation cost record or null if not found
 */
async function getTransportationCost(transportId) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.transportation_costs\`
      WHERE transport_id = @transportId
      LIMIT 1
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        transportId: transportId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting transportation cost:', error);
    return null;
  }
}

/**
 * Get transportation costs by challan number
 * @param {string} challanNumber - Challan number
 * @returns {Array} Array of transportation cost records
 */
async function getTransportationCostsByChallan(challanNumber) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.transportation_costs\`
      WHERE challan_number = @challanNumber
      ORDER BY created_at DESC
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
    console.error('Error getting transportation costs by challan:', error);
    return [];
  }
}

/**
 * Get transportation costs by vehicle ID
 * @param {string} vehicleId - Vehicle ID
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of transportation cost records
 */
async function getTransportationCostsByVehicle(vehicleId, filters = {}) {
  try {
    let query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.transportation_costs\`
      WHERE vehicle_id = @vehicleId
    `;
    
    const params = {
      vehicleId: vehicleId
    };
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND DATE(created_at) >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND DATE(created_at) <= @endDate';
      params.endDate = filters.endDate;
    }
    
    // Add vehicle type filter if provided
    if (filters.vehicleType) {
      query += ' AND vehicle_type = @vehicleType';
      params.vehicleType = filters.vehicleType;
    }
    
    query += ' ORDER BY created_at DESC';
    
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
    console.error('Error getting transportation costs by vehicle:', error);
    return [];
  }
}

/**
 * Update transportation cost approval
 * @param {string} transportId - Transport ID
 * @param {Object} approvalData - Approval data
 * @returns {boolean} Success flag
 */
async function updateTransportationCostApproval(transportId, approvalData) {
  try {
    // Build update query dynamically
    const fields = [`approved_by = @approved_by`, `approved_at = @approved_at`, `approval_notes = @approval_notes`];
    const params = {
      transportId: transportId,
      approved_by: approvalData.approvedBy,
      approved_at: new Date().toISOString(),
      approval_notes: approvalData.approvalNotes || null
    };
    
    // Add other fields as needed
    for (const [key, value] of Object.entries(approvalData)) {
      if (!['approvedBy', 'approvalNotes']) {
        // Map camelCase to snake_case for BigQuery fields
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        fields.push(`${dbField} = @${key}`);
        params[key] = value;
      }
    }
    
    const query = `
      UPDATE \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.transportation_costs\`
      SET ${fields.join(', ')}
      WHERE transport_id = @transportId
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    await bigquery.createQueryJob(options);
    
    return true;
  } catch (error) {
    console.error('Error updating transportation cost approval:', error);
    return false;
  }
}

/**
 * Get transportation cost summary
 * @param {Object} filters - Additional filters
 * @returns {Object|null} Transportation cost summary or null if not found
 */
async function getTransportationCostSummary(filters = {}) {
  try {
    let query = `
      SELECT 
        COUNT(*) as total_transports,
        SUM(total_cost_bdt) as total_cost_bdt,
        SUM(customer_payment_bdt) as total_customer_payment_bdt,
        SUM(company_covered_bdt) as total_company_covered_bdt,
        AVG(total_cost_bdt) as average_cost_bdt,
        COUNTIF(customer_agreed_to_pay = TRUE) as customer_agreed_count,
        COUNTIF(approval_required = TRUE) as approval_required_count,
        COUNTIF(approved_by IS NOT NULL) as approved_count,
        COUNTIF(vehicle_type = 'VAN') as van_count,
        COUNTIF(vehicle_type = 'TRUCK') as truck_count,
        COUNTIF(vehicle_type = 'BIKE') as bike_count
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.transportation_costs\`
      WHERE 1=1
    `;
    
    const params = {};
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND DATE(created_at) >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND DATE(created_at) <= @endDate';
      params.endDate = filters.endDate;
    }
    
    // Add vehicle type filter if provided
    if (filters.vehicleType) {
      query += ' AND vehicle_type = @vehicleType';
      params.vehicleType = filters.vehicleType;
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
    console.error('Error getting transportation cost summary:', error);
    return null;
  }
}

/**
 * Get transportation costs requiring approval
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of transportation cost records requiring approval
 */
async function getTransportationCostsRequiringApproval(filters = {}) {
  try {
    let query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.transportation_costs\`
      WHERE approval_required = TRUE AND approved_by IS NULL
    `;
    
    const params = {};
    
    // Add vehicle type filter if provided
    if (filters.vehicleType) {
      query += ' AND vehicle_type = @vehicleType';
      params.vehicleType = filters.vehicleType;
    }
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND DATE(created_at) >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND DATE(created_at) <= @endDate';
      params.endDate = filters.endDate;
    }
    
    query += ' ORDER BY created_at ASC';
    
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
    console.error('Error getting transportation costs requiring approval:', error);
    return [];
  }
}

/**
 * Get transportation costs by date range
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of transportation cost records
 */
async function getTransportationCostsByDateRange(startDate, endDate, filters = {}) {
  try {
    let query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.transportation_costs\`
      WHERE DATE(created_at) >= @startDate AND DATE(created_at) <= @endDate
    `;
    
    const params = {
      startDate: startDate,
      endDate: endDate
    };
    
    // Add vehicle type filter if provided
    if (filters.vehicleType) {
      query += ' AND vehicle_type = @vehicleType';
      params.vehicleType = filters.vehicleType;
    }
    
    // Add challan number filter if provided
    if (filters.challanNumber) {
      query += ' AND challan_number = @challanNumber';
      params.challanNumber = filters.challanNumber;
    }
    
    query += ' ORDER BY created_at DESC';
    
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
    console.error('Error getting transportation costs by date range:', error);
    return [];
  }
}

// Export functions
module.exports = {
  recordTransportationCost,
  getTransportationCost,
  getTransportationCostsByChallan,
  getTransportationCostsByVehicle,
  updateTransportationCostApproval,
  getTransportationCostSummary,
  getTransportationCostsRequiringApproval,
  getTransportationCostsByDateRange
};