/**
 * Dealer Challan Management System
 * 
 * This module implements the dealer challan functionality
 * as specified in Design 11.
 */

const { BigQuery } = require('@google-cloud/bigquery');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Create a new dealer challan item
 * @param {Object} challanData - Challan item data
 * @returns {string} Challan item ID
 */
async function createDealerChallanItem(challanData) {
  try {
    // Generate challan item ID
    const challanItemId = `CHALLANITEM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Calculate final price
    const finalPrice = challanData.dealerPriceBdt * (1 - challanData.discountPercent / 100);
    
    // Set values
    const challanItem = {
      challan_item_id: challanItemId,
      transfer_id: challanData.transferId,
      challan_number: challanData.challanNumber,
      machine_model_id: challanData.machineModelId,
      machine_model_name: challanData.machineModelName,
      serial_number: challanData.serialNumber || null,
      quantity: challanData.quantity,
      dealer_price_bdt: challanData.dealerPriceBdt,
      discount_percent: challanData.discountPercent,
      final_price_bdt: finalPrice,
      warranty_months: challanData.warrantyMonths,
      created_at: new Date().toISOString()
    };
    
    // Insert challan item
    const query = `
      INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_challan_items\`
      (challan_item_id, transfer_id, challan_number, machine_model_id, machine_model_name, serial_number,
       quantity, dealer_price_bdt, discount_percent, final_price_bdt, warranty_months, created_at)
      VALUES
      (@challan_item_id, @transfer_id, @challan_number, @machine_model_id, @machine_model_name, @serial_number,
       @quantity, @dealer_price_bdt, @discount_percent, @final_price_bdt, @warranty_months, @created_at)
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: challanItem
    };
    
    await bigquery.createQueryJob(options);
    
    return challanItemId;
  } catch (error) {
    console.error('Error creating dealer challan item:', error);
    throw error;
  }
}

/**
 * Get challan items by challan number
 * @param {string} challanNumber - Challan number
 * @returns {Array} Array of challan items
 */
async function getChallanItemsByChallanNumber(challanNumber) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_challan_items\`
      WHERE challan_number = @challanNumber
      ORDER BY machine_model_name
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
    console.error('Error getting challan items by challan number:', error);
    return [];
  }
}

/**
 * Get challan items by transfer ID
 * @param {string} transferId - Transfer ID
 * @returns {Array} Array of challan items
 */
async function getChallanItemsByTransferId(transferId) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_challan_items\`
      WHERE transfer_id = @transferId
      ORDER BY machine_model_name
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
    console.error('Error getting challan items by transfer ID:', error);
    return [];
  }
}

/**
 * Get challan summary by challan number
 * @param {string} challanNumber - Challan number
 * @returns {Object|null} Challan summary or null if not found
 */
async function getChallanSummary(challanNumber) {
  try {
    const query = `
      SELECT 
        challan_number,
        COUNT(*) as total_items,
        SUM(quantity) as total_quantity,
        SUM(final_price_bdt) as total_value_bdt,
        AVG(discount_percent) as average_discount_percent
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_challan_items\`
      WHERE challan_number = @challanNumber
      GROUP BY challan_number
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
    console.error('Error getting challan summary:', error);
    return null;
  }
}

/**
 * Validate stock availability for challan items
 * @param {string} transferId - Transfer ID
 * @returns {Array} Array of items with insufficient stock
 */
async function validateStockAvailability(transferId) {
  try {
    const query = `
      SELECT
        dci.machine_model_id,
        dci.machine_model_name,
        dci.quantity AS requested,
        COALESCE(isc.current_stock, 0) AS current_stock
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_challan_items\` dci
      LEFT JOIN \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.inventory_stock_cache\` isc
        ON dci.machine_model_id = isc.machine_model_id
      WHERE dci.transfer_id = @transferId
        AND (isc.current_stock < dci.quantity OR isc.current_stock IS NULL)
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
    console.error('Error validating stock availability:', error);
    return [];
  }
}

/**
 * Get dealer challan history
 * @param {string} dealerId - Dealer ID
 * @param {Object} filters - Additional filters
 * @returns {Array} Array of challan items
 */
async function getDealerChallanHistory(dealerId, filters = {}) {
  try {
    let query = `
      SELECT dci.*, dst.challan_date, dst.transfer_status
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_challan_items\` dci
      JOIN \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_stock_transfers_journal\` dst
        ON dci.transfer_id = dst.transfer_id
      WHERE dst.to_dealer_id = @dealerId
    `;
    
    const params = {
      dealerId: dealerId
    };
    
    // Add date range filter if provided
    if (filters.startDate) {
      query += ' AND dst.challan_date >= @startDate';
      params.startDate = filters.startDate;
    }
    
    if (filters.endDate) {
      query += ' AND dst.challan_date <= @endDate';
      params.endDate = filters.endDate;
    }
    
    // Add machine model filter if provided
    if (filters.machineModelId) {
      query += ' AND dci.machine_model_id = @machineModelId';
      params.machineModelId = filters.machineModelId;
    }
    
    query += ' ORDER BY dst.challan_date DESC, dci.machine_model_name';
    
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
    console.error('Error getting dealer challan history:', error);
    return [];
  }
}

/**
 * Get top selling machine models for a dealer
 * @param {string} dealerId - Dealer ID
 * @param {number} limit - Number of models to return
 * @returns {Array} Array of top selling machine models
 */
async function getTopSellingModelsForDealer(dealerId, limit = 10) {
  try {
    const query = `
      SELECT 
        dci.machine_model_id,
        dci.machine_model_name,
        SUM(dci.quantity) as total_quantity,
        SUM(dci.final_price_bdt) as total_value_bdt,
        COUNT(*) as transaction_count
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_challan_items\` dci
      JOIN \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_stock_transfers_journal\` dst
        ON dci.transfer_id = dst.transfer_id
      WHERE dst.to_dealer_id = @dealerId
      GROUP BY dci.machine_model_id, dci.machine_model_name
      ORDER BY total_quantity DESC
      LIMIT @limit
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        dealerId: dealerId,
        limit: limit
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting top selling models for dealer:', error);
    return [];
  }
}

// Export functions
module.exports = {
  createDealerChallanItem,
  getChallanItemsByChallanNumber,
  getChallanItemsByTransferId,
  getChallanSummary,
  validateStockAvailability,
  getDealerChallanHistory,
  getTopSellingModelsForDealer
};
