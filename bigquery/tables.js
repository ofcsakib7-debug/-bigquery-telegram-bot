// === PHASE COMPLETION MARKER - DO NOT MODIFY ===
// Design: 1
// Phase: 2
// Component: bigquery_table_creation
// Status: IN_PROGRESS
// Last Modified: 2025-08-24 11:45 UTC
// Next Step: Implement table creation functions for all required tables
// =============================================

const { BigQuery } = require('@google-cloud/bigquery');
const { 
  PAYMENT_RECEIPTS_SCHEMA, 
  ACCOUNTING_GENERAL_LEDGER_SCHEMA 
} = require('./schemas');
const {
  UI_INTERACTION_PATTERNS_SCHEMA,
  MASTER_CACHE_SCHEMA,
  BQML_TRAINING_UI_OPTIMIZATION_SCHEMA,
  CACHE_UI_OPTIMIZATION_SCHEMA
} = require('./additional_schemas');

// Initialize BigQuery client
const bigquery = new BigQuery();

/**
 * Create a BigQuery table with the specified schema
 * @param {string} datasetId - Dataset ID
 * @param {Object} tableSchema - Table schema definition
 */
async function createTable(datasetId, tableSchema) {
  try {
    const dataset = bigquery.dataset(datasetId);
    const table = dataset.table(tableSchema.tableId);
    
    // Check if table already exists
    const [exists] = await table.exists();
    
    if (exists) {
      console.log(`Table ${tableSchema.tableId} already exists`);
      return;
    }
    
    // Create table options
    const options = {
      schema: tableSchema.schema,
      description: tableSchema.description,
      timePartitioning: {
        type: tableSchema.partitioning.type,
        field: tableSchema.partitioning.field
      },
      clustering: tableSchema.clustering
    };
    
    // Add table expiration if specified
    if (tableSchema.expiration) {
      const expirationMs = calculateExpirationMs(tableSchema.expiration);
      options.expires = new Date(Date.now() + expirationMs);
    }
    
    // Create the table
    const [createdTable] = await dataset.createTable(tableSchema.tableId, options);
    console.log(`Table ${createdTable.id} created successfully`);
    
  } catch (error) {
    console.error(`Error creating table ${tableSchema.tableId}:`, error);
  }
}

/**
 * Calculate expiration time in milliseconds
 * @param {Object} expiration - Expiration configuration
 * @returns {number} Expiration time in milliseconds
 */
function calculateExpirationMs(expiration) {
  const msInDay = 24 * 60 * 60 * 1000;
  
  switch (expiration.unit) {
    case 'DAYS':
      return expiration.period * msInDay;
    case 'MONTHS':
      return expiration.period * 30 * msInDay;
    case 'YEARS':
      return expiration.period * 365 * msInDay;
    default:
      return 365 * msInDay; // Default to 1 year
  }
}

/**
 * Create all required tables for Design 1
 * @param {string} datasetId - Dataset ID
 */
async function createDesign1Tables(datasetId) {
  try {
    console.log('Creating Design 1 BigQuery tables...');
    
    // Create payment_receipts table
    await createTable(datasetId, PAYMENT_RECEIPTS_SCHEMA);
    
    // Create accounting_general_ledger table
    await createTable(datasetId, ACCOUNTING_GENERAL_LEDGER_SCHEMA);
    
    // Create ui_interaction_patterns table
    await createTable(datasetId, UI_INTERACTION_PATTERNS_SCHEMA);
    
    // Create master_cache table
    await createTable(datasetId, MASTER_CACHE_SCHEMA);
    
    // Create bqml_training_ui_optimization table
    await createTable(datasetId, BQML_TRAINING_UI_OPTIMIZATION_SCHEMA);
    
    // Create cache_ui_optimization table
    await createTable(datasetId, CACHE_UI_OPTIMIZATION_SCHEMA);
    
    console.log('Design 1 tables creation completed');
    
  } catch (error) {
    console.error('Error creating Design 1 tables:', error);
  }
}

/**
 * Initialize BigQuery dataset
 * @param {string} datasetId - Dataset ID
 */
async function initializeDataset(datasetId) {
  try {
    const dataset = bigquery.dataset(datasetId);
    
    // Check if dataset exists
    const [exists] = await dataset.exists();
    
    if (!exists) {
      // Create dataset with default table expiration of 30 days
      const [createdDataset] = await bigquery.createDataset(datasetId, {
        defaultTableExpirationMs: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      console.log(`Dataset ${createdDataset.id} created successfully`);
    } else {
      console.log(`Dataset ${datasetId} already exists`);
    }
    
  } catch (error) {
    console.error(`Error initializing dataset ${datasetId}:`, error);
  }
}

// Export functions
module.exports = {
  createTable,
  createDesign1Tables,
  initializeDataset
};