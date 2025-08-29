/**
 * Dealer Profile Management System
 * 
 * This module implements the dealer profile management functionality
 * as specified in Design 11.
 */

const { BigQuery } = require('@google-cloud/bigquery');
const { Firestore } = require('@google-cloud/firestore');

// Initialize clients
const bigquery = new BigQuery();
const firestore = new Firestore();

/**
 * Create a new dealer profile
 * @param {Object} dealerData - Dealer profile data
 * @returns {string} Dealer ID
 */
async function createDealerProfile(dealerData) {
  try {
    // Generate dealer ID
    const dealerId = `DEALER-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
    
    // Set default values
    const dealer = {
      dealer_id: dealerId,
      dealer_name: dealerData.dealerName,
      dealer_type: dealerData.dealerType,
      parent_dealer_id: dealerData.parentDealerId || null,
      contact_person: dealerData.contactPerson,
      contact_phone: dealerData.contactPhone,
      contact_email: dealerData.contactEmail || null,
      address: dealerData.address,
      territory: dealerData.territory,
      opening_date: dealerData.openingDate || new Date().toISOString().split('T')[0],
      status: dealerData.status || 'ACTIVE',
      dealer_tier: dealerData.dealerTier || 'BRONZE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Insert dealer profile
    const query = `
      INSERT INTO \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_profiles\`
      (dealer_id, dealer_name, dealer_type, parent_dealer_id, contact_person, contact_phone, contact_email,
       address, territory, opening_date, status, dealer_tier, created_at, updated_at)
      VALUES
      (@dealer_id, @dealer_name, @dealer_type, @parent_dealer_id, @contact_person, @contact_phone, @contact_email,
       @address, @territory, @opening_date, @status, @dealer_tier, @created_at, @updated_at)
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: dealer
    };
    
    await bigquery.createQueryJob(options);
    
    return dealerId;
  } catch (error) {
    console.error('Error creating dealer profile:', error);
    throw error;
  }
}

/**
 * Get dealer profile by ID
 * @param {string} dealerId - Dealer ID
 * @returns {Object|null} Dealer profile or null if not found
 */
async function getDealerProfile(dealerId) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_profiles\`
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
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting dealer profile:', error);
    return null;
  }
}

/**
 * Update dealer profile
 * @param {string} dealerId - Dealer ID
 * @param {Object} updateData - Data to update
 * @returns {boolean} Success flag
 */
async function updateDealerProfile(dealerId, updateData) {
  try {
    // Build update query dynamically
    const fields = [];
    const params = { dealerId };
    
    for (const [key, value] of Object.entries(updateData)) {
      // Map camelCase to snake_case for BigQuery fields
      const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      fields.push(`${dbField} = @${key}`);
      params[key] = value;
    }
    
    // Always update the updated_at timestamp
    fields.push('updated_at = @updated_at');
    params.updated_at = new Date().toISOString();
    
    const query = `
      UPDATE \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_profiles\`
      SET ${fields.join(', ')}
      WHERE dealer_id = @dealerId
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: params
    };
    
    await bigquery.createQueryJob(options);
    
    return true;
  } catch (error) {
    console.error('Error updating dealer profile:', error);
    return false;
  }
}

/**
 * Get dealers by parent dealer ID
 * @param {string} parentDealerId - Parent dealer ID
 * @returns {Array} Array of dealer profiles
 */
async function getDealersByParent(parentDealerId) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_profiles\`
      WHERE parent_dealer_id = @parentDealerId
      ORDER BY dealer_name
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        parentDealerId: parentDealerId
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting dealers by parent:', error);
    return [];
  }
}

/**
 * Get top-level dealers (no parent)
 * @returns {Array} Array of top-level dealer profiles
 */
async function getTopLevelDealers() {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_profiles\`
      WHERE parent_dealer_id IS NULL
      ORDER BY dealer_name
    `;
    
    const options = {
      query: query,
      location: 'US'
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting top-level dealers:', error);
    return [];
  }
}

/**
 * Get dealers by territory
 * @param {string} territory - Territory name
 * @returns {Array} Array of dealer profiles
 */
async function getDealersByTerritory(territory) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_profiles\`
      WHERE territory = @territory
      ORDER BY dealer_name
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        territory: territory
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting dealers by territory:', error);
    return [];
  }
}

/**
 * Get dealers by status
 * @param {string} status - Dealer status (ACTIVE, INACTIVE, PROBATION)
 * @returns {Array} Array of dealer profiles
 */
async function getDealersByStatus(status) {
  try {
    const query = `
      SELECT *
      FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_profiles\`
      WHERE status = @status
      ORDER BY dealer_name
    `;
    
    const options = {
      query: query,
      location: 'US',
      params: {
        status: status
      }
    };
    
    const [job] = await bigquery.createQueryJob(options);
    const [rows] = await job.getQueryResults();
    
    return rows;
  } catch (error) {
    console.error('Error getting dealers by status:', error);
    return [];
  }
}

/**
 * Get dealer hierarchy
 * @param {string} dealerId - Dealer ID (optional, if not provided gets full hierarchy)
 * @returns {Array} Array of dealer profiles in hierarchy
 */
async function getDealerHierarchy(dealerId = null) {
  try {
    let query, params;
    
    if (dealerId) {
      // Get specific dealer's hierarchy (this dealer and all sub-dealers)
      query = `
        WITH RECURSIVE dealer_hierarchy AS (
          SELECT *, 0 as level
          FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_profiles\`
          WHERE dealer_id = @dealerId
          UNION ALL
          SELECT dp.*, dh.level + 1
          FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_profiles\` dp
          JOIN dealer_hierarchy dh ON dp.parent_dealer_id = dh.dealer_id
        )
        SELECT * FROM dealer_hierarchy
        ORDER BY level, dealer_name
      `;
      params = { dealerId };
    } else {
      // Get full hierarchy
      query = `
        WITH RECURSIVE dealer_hierarchy AS (
          SELECT *, 0 as level
          FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_profiles\`
          WHERE parent_dealer_id IS NULL
          UNION ALL
          SELECT dp.*, dh.level + 1
          FROM \`${process.env.BIGQUERY_PROJECT_ID || 'project'}.${process.env.BIGQUERY_DATASET_ID || 'dataset'}.dealer_profiles\` dp
          JOIN dealer_hierarchy dh ON dp.parent_dealer_id = dh.dealer_id
        )
        SELECT * FROM dealer_hierarchy
        ORDER BY level, dealer_name
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
    
    return rows;
  } catch (error) {
    console.error('Error getting dealer hierarchy:', error);
    return [];
  }
}

// Export functions
module.exports = {
  createDealerProfile,
  getDealerProfile,
  updateDealerProfile,
  getDealersByParent,
  getTopLevelDealers,
  getDealersByTerritory,
  getDealersByStatus,
  getDealerHierarchy
};
