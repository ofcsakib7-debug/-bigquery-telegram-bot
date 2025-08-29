/**
 * Dealer Stock Transfer Management System
 * 
 * This module implements the dealer stock transfer functionality
 * as specified in Design 11.
 */

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Create a new dealer stock transfer
 * @param {Object} transferData - Stock transfer data
 * @returns {string} Transfer ID
 */
async function createDealerStockTransfer(transferData) {
  try {
    // Generate transfer ID
    const transferId = `TRANSFER-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Generate challan number
    const challanNumber = transferData.challanNumber || `CH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Set default values
    const transfer = {
      transfer_id: transferId,
      transfer_date: transferData.transferDate || new Date().toISOString(),
      from_branch_id: transferData.fromBranchId,
      to_dealer_id: transferData.toDealerId,
      transfer_type: transferData.transferType || 'NEW_STOCK',
      transfer_status: transferData.transferStatus || 'PENDING',
      challan_number: challanNumber,
      challan_date: transferData.challanDate || new Date().toISOString().split('T')[0],
      vehicle_id: transferData.vehicleId || null,
      driver_id: transferData.driverId || null,
      expected_delivery_date: transferData.expectedDeliveryDate || null,
      actual_delivery_date: transferData.actualDeliveryDate || null,
      created_by: transferData.createdBy,
      created_at: new Date().toISOString()
    };
    
    // Insert stock transfer journal entry
    const query = `
      INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_stock_transfers_journal\`
      (transfer_id, transfer_date, from_branch_id, to_dealer_id, transfer_type, transfer_status,
       challan_number, challan_date, vehicle_id, driver_id, expected_delivery_date, actual_delivery_date,
       created_by, created_at)
      VALUES
      (@transfer_id, @transfer_date, @from_branch_id, @to_dealer_id, @transfer_type, @transfer_status,
       @challan_number, @challan_date, @vehicle_id, @driver_id, @expected_delivery_date, @actual_delivery_date,
       @created_by, @created_at)
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: transfer
    };
    
    await bigquery.createQueryJob(options);
    
    return transferId;
  } catch (error) {
    console.error('Error creating dealer stock transfer:', error);
    throw error;
  }
}

/**
 * Get dealer stock transfer by ID
 * @param {string} transferId - Transfer ID
 * @returns {Object|null} Stock transfer or null if not found
 */
async function getDealerStockTransfer(transferId) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_stock_transfers_journal\`
      WHERE transfer_id = @transferId
      LIMIT 1
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
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting dealer stock transfer:', error);
    return null;
  }
}

/**
 * Update dealer stock transfer status
 * @param {string} transferId - Transfer ID
 * @param {string} status - New status
 * @param {Object} additionalData - Additional data to update
 * @returns {boolean} Success flag
 */
async function updateDealerStockTransferStatus(transferId, status, additionalData = {}) {
  try {
    // Build update query dynamically
    const fields = [`transfer_status = @transfer_status`];
    const params = {
      transferId: transferId,
      transfer_status: status
    };
    
    // Add additional fields if provided
    for (const [key, value] of Object.entries(additionalData)) {
      // Map camelCase to snake_case for BigQuery fields
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${dbField} = @${key}`);
      params[key] = value;
    }
    
    const query = `
      UPDATE \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_stock_transfers_journal\`
      SET ${fields.join(', ')}
      WHERE transfer_id = @transferId
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    await bigquery.createQueryJob(options);
    
    return true;
  } catch (error) {
    console.error('Error updating dealer stock transfer status:', error);
    return false;
  }
}

/**
 * Get dealer stock transfers by dealer ID
 * @param {string} dealerId - Dealer ID
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of stock transfers
 */
async function getDealerStockTransfersByDealer(dealerId, filters = {}) {
  try {
    let query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_stock_transfers_journal\`
      WHERE to_dealer_id = @dealerId
    `;
    
    const params = {
      dealerId: dealerId
    };
    
    // Add status filter if provided
    if (filters.status) {
      query += ' AND transfer_status = @status';
      params.status = filters.status;
    }
    
    // Add transfer type filter if provided
    if (filters.transferType) {
      query += ' AND transfer_type = @transferType';
      params.transferType = filters.transferType;
    }
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND DATE(transfer_date) >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND DATE(transfer_date) <= @endDate';
      params.endDate = filters.endDate;
    }
    
    query += ' ORDER BY transfer_date DESC';
    
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
    console.error('Error getting dealer stock transfers by dealer:', error);
    return [];
  }
}

/**
 * Get dealer stock transfers by branch ID
 * @param {string} branchId - Branch ID
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of stock transfers
 */
async function getDealerStockTransfersByBranch(branchId, filters = {}) {
  try {
    let query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_stock_transfers_journal\`
      WHERE from_branch_id = @branchId
    `;
    
    const params = {
      branchId: branchId
    };
    
    // Add status filter if provided
    if (filters.status) {
      query += ' AND transfer_status = @status';
      params.status = filters.status;
    }
    
    // Add transfer type filter if provided
    if (filters.transferType) {
      query += ' AND transfer_type = @transferType';
      params.transferType = filters.transferType;
    }
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND DATE(transfer_date) >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND DATE(transfer_date) <= @endDate';
      params.endDate = filters.endDate;
    }
    
    query += ' ORDER BY transfer_date DESC';
    
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
    console.error('Error getting dealer stock transfers by branch:', error);
    return [];
  }
}

/**
 * Get pending dealer stock transfers
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of pending stock transfers
 */
async function getPendingDealerStockTransfers(filters = {}) {
  try {
    let query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_stock_transfers_journal\`
      WHERE transfer_status = 'PENDING'
    `;
    
    const params = {};
    
    // Add dealer filter if provided
    if (filters.dealerId) {
      query += ' AND to_dealer_id = @dealerId';
      params.dealerId = filters.dealerId;
    }
    
    // Add branch filter if provided
    if (filters.branchId) {
      query += ' AND from_branch_id = @branchId';
      params.branchId = filters.branchId;
    }
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND DATE(transfer_date) >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND DATE(transfer_date) <= @endDate';
      params.endDate = filters.endDate;
    }
    
    query += ' ORDER BY transfer_date ASC';
    
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
    console.error('Error getting pending dealer stock transfers:', error);
    return [];
  }
}

/**
 * Get dealer stock transfer statistics
 * @param {string} dealerId - Dealer ID (optional)
 * @returns {Object} Transfer statistics
 */
async function getDealerStockTransferStats(dealerId = null) {
  try {
    let query, params;
    
    if (dealerId) {
      query = `
        SELECT 
          COUNT(*) as total_transfers,
          COUNTIF(transfer_status = 'PENDING') as pending_transfers,
          COUNTIF(transfer_status = 'SHIPPED') as shipped_transfers,
          COUNTIF(transfer_status = 'DELIVERED') as delivered_transfers,
          COUNTIF(transfer_status = 'RECEIVED') as received_transfers,
          COUNTIF(transfer_type = 'NEW_STOCK') as new_stock_transfers,
          COUNTIF(transfer_type = 'RETURN') as return_transfers,
          COUNTIF(transfer_type = 'EXCHANGE') as exchange_transfers
        FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_stock_transfers_journal\`
        WHERE to_dealer_id = @dealerId
      `;
      params = { dealerId };
    } else {
      query = `
        SELECT 
          COUNT(*) as total_transfers,
          COUNTIF(transfer_status = 'PENDING') as pending_transfers,
          COUNTIF(transfer_status = 'SHIPPED') as shipped_transfers,
          COUNTIF(transfer_status = 'DELIVERED') as delivered_transfers,
          COUNTIF(transfer_status = 'RECEIVED') as received_transfers,
          COUNTIF(transfer_type = 'NEW_STOCK') as new_stock_transfers,
          COUNTIF(transfer_type = 'RETURN') as return_transfers,
          COUNTIF(transfer_type = 'EXCHANGE') as exchange_transfers
        FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_stock_transfers_journal\`
      `;
      params = {};
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
    console.error('Error getting dealer stock transfer stats:', error);
    return null;
  }
}

// Export functions
module.exports = {
  createDealerStockTransfer,
  getDealerStockTransfer,
  updateDealerStockTransferStatus,
  getDealerStockTransfersByDealer,
  getDealerStockTransfersByBranch,
  getPendingDealerStockTransfers,
  getDealerStockTransferStats
};